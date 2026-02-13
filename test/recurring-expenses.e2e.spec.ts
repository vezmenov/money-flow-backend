import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { CategoriesModule } from '../src/categories/categories.module';
import { Category } from '../src/categories/category.entity';
import { OpenClawModule } from '../src/openclaw/openclaw.module';
import { RecurringExpense } from '../src/recurring-expenses/recurring-expense.entity';
import { RecurringExpensesProcessor } from '../src/recurring-expenses/recurring-expenses.processor';
import { RecurringExpensesModule } from '../src/recurring-expenses/recurring-expenses.module';
import { recurringTransactionIdempotencyKey } from '../src/recurring-expenses/recurring-expenses.service';
import { RecurringProcessingState } from '../src/recurring-expenses/recurring-processing-state.entity';
import { SettingsModule } from '../src/settings/settings.module';
import { Settings } from '../src/settings/settings.entity';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { Transaction } from '../src/transactions/transaction.entity';

describe('Recurring expenses + timezone + OpenClaw', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.OPENCLAW_API_KEY = 'devkey';

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [
            Category,
            Transaction,
            Settings,
            RecurringExpense,
            RecurringProcessingState,
          ],
        }),
        CategoriesModule,
        TransactionsModule,
        SettingsModule,
        RecurringExpensesModule,
        OpenClawModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    delete process.env.OPENCLAW_API_KEY;
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  it('timezone default is +03:00 and normalizes UTC+3', async () => {
    await request(app.getHttpServer())
      .get('/api/settings/timezone')
      .expect(200)
      .expect({ utcOffset: '+03:00' });

    await request(app.getHttpServer())
      .put('/api/settings/timezone')
      .send({ utcOffset: 'UTC+3' })
      .expect(200)
      .expect({ utcOffset: '+03:00' });
  });

  it('creates recurring expense, lists for month, and deletes it', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .send({ name: 'Rent' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const recurring = await request(app.getHttpServer())
      .post('/api/recurring-expenses')
      .send({
        categoryId: category.id,
        amount: 1000,
        dayOfMonth: 13,
        date: '2026-02-13',
        description: 'Rent',
      })
      .expect(201)
      .then((r) => r.body as { id: string });

    const list = await request(app.getHttpServer())
      .get('/api/recurring-expenses')
      .query({ month: '2026-02' })
      .expect(200)
      .then((r) => r.body as any[]);

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(recurring.id);
    expect(list[0].scheduledDate).toBe('2026-02-13');
    expect(list[0].committed).toBe(false);

    await request(app.getHttpServer())
      .delete(`/api/recurring-expenses/${recurring.id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/recurring-expenses')
      .query({ month: '2026-02' })
      .expect(200)
      .then((r) => {
        expect(r.body).toEqual([]);
      });
  });

  it('OpenClaw recurring endpoints require x-api-key', async () => {
    await request(app.getHttpServer())
      .get('/api/openclaw/v1/recurring-expenses')
      .query({ month: '2026-02' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/openclaw/v1/recurring-expenses')
      .set('x-api-key', 'devkey')
      .query({ month: '2026-02' })
      .expect(200);
  });

  it('processor commits a recurring transaction at end-of-day and list shows committed', async () => {
    // Use UTC for deterministic "local time" in the processor.
    await request(app.getHttpServer())
      .put('/api/settings/timezone')
      .send({ utcOffset: '+00:00' })
      .expect(200);

    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .send({ name: 'Subscriptions' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const recurring = await request(app.getHttpServer())
      .post('/api/recurring-expenses')
      .send({
        categoryId: category.id,
        amount: 10,
        dayOfMonth: 13,
        date: '2026-02-13',
        description: 'Test subscription',
      })
      .expect(201)
      .then((r) => r.body as { id: string });

    const processor = app.get(RecurringExpensesProcessor);

    const originalNow = Date.now;
    Date.now = () => new Date('2026-02-13T23:56:00.000Z').getTime();
    try {
      await processor.tick();
    } finally {
      Date.now = originalNow;
    }

    const txs = await request(app.getHttpServer())
      .get('/api/transactions')
      .expect(200)
      .then((r) => r.body as any[]);

    const expectedKey = recurringTransactionIdempotencyKey(recurring.id, '2026-02-13');
    expect(txs.some((t) => t.source === 'recurring' && t.idempotencyKey === expectedKey)).toBe(
      true,
    );

    const list = await request(app.getHttpServer())
      .get('/api/recurring-expenses')
      .query({ month: '2026-02' })
      .expect(200)
      .then((r) => r.body as any[]);

    expect(list).toHaveLength(1);
    expect(list[0].committed).toBe(true);

    // Deleting the template must not delete committed transactions.
    await request(app.getHttpServer())
      .delete(`/api/recurring-expenses/${recurring.id}`)
      .expect(204);

    const txsAfterDelete = await request(app.getHttpServer())
      .get('/api/transactions')
      .expect(200)
      .then((r) => r.body as any[]);

    expect(
      txsAfterDelete.some((t) => t.source === 'recurring' && t.idempotencyKey === expectedKey),
    ).toBe(true);
  });

  it('dayOfMonth=31 shifts to last day of shorter months in listing', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .send({ name: 'Bills' })
      .expect(201)
      .then((r) => r.body as { id: string });

    await request(app.getHttpServer())
      .post('/api/recurring-expenses')
      .send({
        categoryId: category.id,
        amount: 1,
        dayOfMonth: 31,
        date: '2026-01-31',
        description: 'Edge case',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/recurring-expenses')
      .query({ month: '2026-02' })
      .expect(200)
      .then((r) => r.body as any[]);

    expect(list).toHaveLength(1);
    expect(list[0].scheduledDate).toBe('2026-02-28');
  });
});
