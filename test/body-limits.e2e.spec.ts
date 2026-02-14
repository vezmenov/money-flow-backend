import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { Category } from '../src/categories/category.entity';
import { CategoriesModule } from '../src/categories/categories.module';
import { configureApp } from '../src/bootstrap';
import { OpenClawModule } from '../src/openclaw/openclaw.module';
import { RecurringExpense } from '../src/recurring-expenses/recurring-expense.entity';
import { RecurringProcessingState } from '../src/recurring-expenses/recurring-processing-state.entity';
import { Settings } from '../src/settings/settings.entity';
import { Transaction } from '../src/transactions/transaction.entity';

describe('Security: body size limits', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.OPENCLAW_API_KEY = 'devkey';
    process.env.APP_API_KEY = 'appkey';

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [Category, Transaction, Settings, RecurringExpense, RecurringProcessingState],
        }),
        CategoriesModule,
        OpenClawModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    delete process.env.OPENCLAW_API_KEY;
    delete process.env.APP_API_KEY;
    await app.close();
  });

  it('allows bigger payloads for OpenClaw import (<= 5mb)', async () => {
    const big = 'a'.repeat(2 * 1024 * 1024);

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey: 'openclaw:big:1',
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
          },
        ],
        blob: big,
      })
      .expect(200);
  });

  it('rejects bigger payloads for regular API (> 1mb)', async () => {
    const big = 'a'.repeat(2 * 1024 * 1024);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', 'appkey')
      .send({ name: 'A', blob: big })
      .expect(413);
  });

  it('rejects too large OpenClaw import (> 5mb)', async () => {
    const big = 'a'.repeat(6 * 1024 * 1024);

    await request(app.getHttpServer())
      .post('/api/openclaw/v1/transactions/import')
      .set('x-api-key', 'devkey')
      .send({
        transactions: [
          {
            idempotencyKey: 'openclaw:big:2',
            amount: 1,
            date: '2026-02-13',
            categoryName: 'Food',
          },
        ],
        blob: big,
      })
      .expect(413);
  });
});
