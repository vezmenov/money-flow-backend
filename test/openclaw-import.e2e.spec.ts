import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { Category } from '../src/categories/category.entity';
import { OpenClawModule } from '../src/openclaw/openclaw.module';
import { RecurringExpense } from '../src/recurring-expenses/recurring-expense.entity';
import { RecurringProcessingState } from '../src/recurring-expenses/recurring-processing-state.entity';
import { Settings } from '../src/settings/settings.entity';
import { Transaction } from '../src/transactions/transaction.entity';

describe('OpenClaw import', () => {
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
          entities: [Category, Transaction, Settings, RecurringExpense, RecurringProcessingState],
        }),
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

  it('returns 503 when OPENCLAW_API_KEY is not configured', async () => {
    const saved = process.env.OPENCLAW_API_KEY;
    delete process.env.OPENCLAW_API_KEY;
    try {
      await request(app.getHttpServer()).get('/api/openclaw/v1/health').expect(503);
    } finally {
      process.env.OPENCLAW_API_KEY = saved;
    }
  });

  it('requires x-api-key', async () => {
    await request(app.getHttpServer()).get('/api/openclaw/v1/health').expect(401);
  });

  it('imports a transaction (creates category) and upserts by idempotencyKey', async () => {
    const idempotencyKey = 'openclaw:test:1';

    const created = await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 10.5,
            date: '2026-02-13',
            categoryName: '  Food  ',
            description: 'First',
          },
        ],
      })
      .expect(200)
      .then((r) => r.body as any);

    expect(created.results).toHaveLength(1);
    expect(created.results[0].idempotencyKey).toBe(idempotencyKey);
    expect(created.results[0].action).toBe('created');
    expect(created.results[0].transaction.source).toBe('openclaw');
    expect(created.results[0].transaction.idempotencyKey).toBe(idempotencyKey);
    expect(created.results[0].category.name).toBe('Food');

    const updated = await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 11.0,
            date: '2026-02-13',
            categoryName: 'food',
            description: 'Second',
          },
        ],
      })
      .expect(200)
      .then((r) => r.body as any);

    expect(updated.results).toHaveLength(1);
    expect(updated.results[0].action).toBe('updated');
    expect(updated.results[0].transaction.amount).toBe(11);
    expect(updated.results[0].transaction.description).toBe('Second');
  });

  it('supports GET/DELETE by idempotencyKey for imported transactions', async () => {
    const idempotencyKey = 'openclaw:test:2';

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/openclaw/v1/transactions/${encodeURIComponent(idempotencyKey)}`)
      .set('x-api-key', 'devkey')
      .expect(200)
      .then((r) => {
        expect(r.body.source).toBe('openclaw');
        expect(r.body.idempotencyKey).toBe(idempotencyKey);
      });

    await request(app.getHttpServer())
      .delete(`/api/openclaw/v1/transactions/${encodeURIComponent(idempotencyKey)}`)
      .set('x-api-key', 'devkey')
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/openclaw/v1/transactions/${encodeURIComponent(idempotencyKey)}`)
      .set('x-api-key', 'devkey')
      .expect(404);
  });

  it('handles duplicate idempotencyKey within a single batch deterministically', async () => {
    const idempotencyKey = 'openclaw:test:3';

    const resp = await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
            description: 'A',
          },
          {
            idempotencyKey,
            amount: 2,
            date: '2026-02-13',
            categoryName: 'Food',
            description: 'B',
          },
        ],
      })
      .expect(200)
      .then((r) => r.body as any);

    expect(resp.results).toHaveLength(2);
    expect(resp.results[0].action).toBe('created');
    expect(resp.results[1].action).toBe('updated');

    const got = await request(app.getHttpServer())
      .get(`/api/openclaw/v1/transactions/${encodeURIComponent(idempotencyKey)}`)
      .set('x-api-key', 'devkey')
      .expect(200)
      .then((r) => r.body as any);

    expect(got.amount).toBe(2);
    expect(got.description).toBe('B');
  });

  it('returns 404 on GET for unknown idempotencyKey', async () => {
    await request(app.getHttpServer())
      .get('/api/openclaw/v1/transactions/unknown')
      .set('x-api-key', 'devkey')
      .expect(404);
  });

  it('validates idempotencyKey/categoryName after trim', async () => {
    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey: '   ',
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
          },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey: 'openclaw:test:trim',
            amount: 1,
            date: '2026-02-13',
            categoryName: '   ',
          },
        ],
      })
      .expect(400);
  });

  it('does not overwrite description when description is omitted', async () => {
    const idempotencyKey = 'openclaw:test:desc';

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
            description: 'A',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey,
            amount: 2,
            date: '2026-02-13',
            categoryName: 'Food',
          },
        ],
      })
      .expect(200);

    const got = await request(app.getHttpServer())
      .get(`/api/openclaw/v1/transactions/${encodeURIComponent(idempotencyKey)}`)
      .set('x-api-key', 'devkey')
      .expect(200)
      .then((r) => r.body as any);

    expect(got.amount).toBe(2);
    expect(got.description).toBe('A');
  });

  it('GET /categories returns unique categories (case-insensitive)', async () => {
    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey: 'openclaw:test:cat:1',
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
          },
          {
            idempotencyKey: 'openclaw:test:cat:2',
            amount: 1,
            date: '2026-02-13',
            categoryName: 'food',
          },
        ],
      })
      .expect(200);

    const categories = await request(app.getHttpServer())
      .get('/api/openclaw/v1/categories')
      .set('x-api-key', 'devkey')
      .expect(200)
      .then((r) => r.body as any[]);

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Food');
  });

  it('supports categories CRUD via OpenClaw', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/openclaw/v1/categories')
      .set('x-api-key', 'devkey')
      .send({ name: 'Subscriptions' })
      .expect(201)
      .then((r) => r.body as any);

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Subscriptions');
    expect(created.type).toBe('expense');
    expect(created.color).toBe('#3b82f6');

    const updated = await request(app.getHttpServer())
      .put(`/api/openclaw/v1/categories/${created.id}`)
      .set('x-api-key', 'devkey')
      .send({ name: 'Subscriptions (paid)', color: '#16a34a' })
      .expect(200)
      .then((r) => r.body as any);

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Subscriptions (paid)');
    expect(updated.color).toBe('#16a34a');

    await request(app.getHttpServer())
      .delete(`/api/openclaw/v1/categories/${created.id}`)
      .set('x-api-key', 'devkey')
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/openclaw/v1/categories/${created.id}`)
      .set('x-api-key', 'devkey')
      .expect(404);
  });

  it('validates category color format on OpenClaw create', async () => {
    await request(app.getHttpServer())
      .post('/api/openclaw/v1/categories')
      .set('x-api-key', 'devkey')
      .send({ name: 'Bad color', color: 'red' })
      .expect(400);
  });
});
