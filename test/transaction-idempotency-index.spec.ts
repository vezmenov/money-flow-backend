import { DataSource, QueryFailedError } from 'typeorm';
import { Category } from '../src/categories/category.entity';
import { Transaction } from '../src/transactions/transaction.entity';

describe('Transaction unique (source, idempotencyKey)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      entities: [Category, Transaction],
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  it('enforces uniqueness within the same source', async () => {
    const category = await dataSource.getRepository(Category).save({ name: 'Test' });
    const repo = dataSource.getRepository(Transaction);

    await repo.insert({
      source: 'openclaw',
      idempotencyKey: 'k',
      categoryId: category.id,
      amount: 1,
      date: '2026-02-13',
      description: null,
    });

    await expect(
      repo.insert({
        source: 'openclaw',
        idempotencyKey: 'k',
        categoryId: category.id,
        amount: 2,
        date: '2026-02-13',
        description: null,
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('allows the same idempotencyKey across different sources', async () => {
    const category = await dataSource.getRepository(Category).save({ name: 'Test' });
    const repo = dataSource.getRepository(Transaction);

    await repo.insert({
      source: 'openclaw',
      idempotencyKey: 'k',
      categoryId: category.id,
      amount: 1,
      date: '2026-02-13',
      description: null,
    });

    await repo.insert({
      source: 'recurring',
      idempotencyKey: 'k',
      categoryId: category.id,
      amount: 1,
      date: '2026-02-13',
      description: null,
    });

    const all = await repo.find({ order: { source: 'ASC' } });
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.source)).toEqual(['openclaw', 'recurring']);
  });

  it('allows multiple NULL idempotencyKey values (manual transactions)', async () => {
    const category = await dataSource.getRepository(Category).save({ name: 'Test' });
    const repo = dataSource.getRepository(Transaction);

    await repo.insert({
      source: 'manual',
      idempotencyKey: null,
      categoryId: category.id,
      amount: 1,
      date: '2026-02-13',
      description: null,
    });

    await repo.insert({
      source: 'manual',
      idempotencyKey: null,
      categoryId: category.id,
      amount: 2,
      date: '2026-02-13',
      description: null,
    });

    const all = await repo.find({ order: { amount: 'ASC' } });
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.amount)).toEqual([1, 2]);
  });
});
