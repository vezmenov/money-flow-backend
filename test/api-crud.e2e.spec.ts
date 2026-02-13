import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { CategoriesModule } from '../src/categories/categories.module';
import { Category } from '../src/categories/category.entity';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { Transaction } from '../src/transactions/transaction.entity';

describe('API CRUD (categories/transactions)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const apiKey = 'appkey';

  beforeAll(async () => {
    process.env.APP_API_KEY = apiKey;

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [Category, Transaction],
        }),
        CategoriesModule,
        TransactionsModule,
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
    delete process.env.APP_API_KEY;
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  it('categories: create/list/update/delete', async () => {
    const createdB = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', apiKey)
      .send({ name: 'B' })
      .expect(201)
      .then((r) => r.body as { id: string; name: string });

    const createdA = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', apiKey)
      .send({ name: 'A' })
      .expect(201)
      .then((r) => r.body as { id: string; name: string });

    const list = await request(app.getHttpServer())
      .get('/api/categories')
      .set('x-api-key', apiKey)
      .expect(200)
      .then((r) => r.body as Array<{ id: string; name: string }>);

    // Service sorts by name ASC.
    expect(list.map((c) => c.name)).toEqual(['A', 'B']);

    await request(app.getHttpServer())
      .put(`/api/categories/${createdA.id}`)
      .set('x-api-key', apiKey)
      .send({ name: 'AA' })
      .expect(200)
      .then((r) => {
        expect(r.body.id).toBe(createdA.id);
        expect(r.body.name).toBe('AA');
      });

    await request(app.getHttpServer())
      .delete(`/api/categories/${createdB.id}`)
      .set('x-api-key', apiKey)
      .expect(204);

    const listAfter = await request(app.getHttpServer())
      .get('/api/categories')
      .set('x-api-key', apiKey)
      .expect(200)
      .then((r) => r.body as Array<{ id: string; name: string }>);

    expect(listAfter.map((c) => c.name)).toEqual(['AA']);
  });

  it('categories: 404 on update/delete missing id', async () => {
    await request(app.getHttpServer())
      .put('/api/categories/00000000-0000-0000-0000-000000000000')
      .set('x-api-key', apiKey)
      .send({ name: 'X' })
      .expect(404);

    await request(app.getHttpServer())
      .delete('/api/categories/00000000-0000-0000-0000-000000000000')
      .set('x-api-key', apiKey)
      .expect(404);
  });

  it('transactions: create/list/update/delete + validation', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', apiKey)
      .send({ name: 'Food' })
      .expect(201)
      .then((r) => r.body as { id: string });

    // Validation: invalid amount (too many decimals) should fail.
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({
        categoryId: category.id,
        amount: 1.234,
        date: '2026-02-13',
      })
      .expect(400);

    const created1 = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({
        categoryId: category.id,
        amount: 10.5,
        date: '2026-02-12',
        description: 'Older',
      })
      .expect(201)
      .then((r) => r.body as { id: string; source: string; idempotencyKey?: string | null });

    expect(created1.source).toBe('manual');
    expect(created1.idempotencyKey ?? null).toBeNull();

    const stored = (await dataSource.query(
      `SELECT amountCents as amountCents FROM transactions WHERE id = ?`,
      [created1.id],
    )) as Array<{ amountCents: number }>;
    expect(stored).toHaveLength(1);
    expect(stored[0].amountCents).toBe(1050);

    const created2 = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({
        categoryId: category.id,
        amount: 20,
        date: '2026-02-13',
        description: 'Newer',
      })
      .expect(201)
      .then((r) => r.body as { id: string });

    const list = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .expect('X-Total-Count', '2')
      .expect(200)
      .then((r) => r.body as Array<{ id: string; date: string }>);

    // Service sorts by date DESC.
    expect(list.map((t) => t.id)).toEqual([created2.id, created1.id]);

    await request(app.getHttpServer())
      .put(`/api/transactions/${created2.id}`)
      .set('x-api-key', apiKey)
      .send({ amount: 21.0, description: 'Updated' })
      .expect(200)
      .then((r) => {
        expect(r.body.id).toBe(created2.id);
        expect(r.body.amount).toBe(21);
        expect(r.body.description).toBe('Updated');
      });

    await request(app.getHttpServer())
      .delete(`/api/transactions/${created1.id}`)
      .set('x-api-key', apiKey)
      .expect(204);

    const listAfter = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .expect(200)
      .then((r) => r.body as Array<{ id: string }>);

    expect(listAfter.map((t) => t.id)).toEqual([created2.id]);
  });

  it('transactions: list supports pagination and filters', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', apiKey)
      .send({ name: 'Food' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const tx1 = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({ categoryId: category.id, amount: 1, date: '2026-02-10' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const tx2 = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({ categoryId: category.id, amount: 2, date: '2026-02-11' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const tx3 = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({ categoryId: category.id, amount: 3, date: '2026-02-12' })
      .expect(201)
      .then((r) => r.body as { id: string });

    const page1 = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .query({ limit: 1, offset: 0 })
      .expect(200)
      .then((r) => ({ body: r.body as Array<{ id: string }>, total: r.headers['x-total-count'] }));

    expect(page1.total).toBe('3');
    expect(page1.body.map((t) => t.id)).toEqual([tx3.id]);

    const page2 = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .query({ limit: 1, offset: 1 })
      .expect(200)
      .then((r) => ({ body: r.body as Array<{ id: string }>, total: r.headers['x-total-count'] }));

    expect(page2.total).toBe('3');
    expect(page2.body.map((t) => t.id)).toEqual([tx2.id]);

    const filtered = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .query({ from: '2026-02-11', to: '2026-02-12' })
      .expect(200)
      .then((r) => ({ body: r.body as Array<{ id: string }>, total: r.headers['x-total-count'] }));

    expect(filtered.total).toBe('2');
    expect(filtered.body.map((t) => t.id)).toEqual([tx3.id, tx2.id]);

    const byCategory = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .query({ categoryId: category.id })
      .expect(200)
      .then((r) => r.body as Array<{ id: string }>);

    expect(byCategory.map((t) => t.id)).toEqual([tx3.id, tx2.id, tx1.id]);

    await request(app.getHttpServer())
      .get('/api/transactions')
      .set('x-api-key', apiKey)
      .query({ from: '2026-02-12', to: '2026-02-11' })
      .expect(400);
  });

  it('transactions: 404 on update/delete missing id', async () => {
    await request(app.getHttpServer())
      .put('/api/transactions/00000000-0000-0000-0000-000000000000')
      .set('x-api-key', apiKey)
      .send({ amount: 1 })
      .expect(404);

    await request(app.getHttpServer())
      .delete('/api/transactions/00000000-0000-0000-0000-000000000000')
      .set('x-api-key', apiKey)
      .expect(404);
  });
});
