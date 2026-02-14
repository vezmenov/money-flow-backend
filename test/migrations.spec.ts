import 'reflect-metadata';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Baseline1770940800001 } from '../src/migrations/20260213-0001-baseline';
import { AmountCents1770940800002 } from '../src/migrations/20260213-0002-amount-cents';
import { TransactionsIndexes1770940800003 } from '../src/migrations/20260213-0003-transactions-indexes';
import { JobLocks1770940800004 } from '../src/migrations/20260213-0004-job-locks';

describe('Migrations smoke', () => {
  const migrations = [
    Baseline1770940800001,
    AmountCents1770940800002,
    TransactionsIndexes1770940800003,
    JobLocks1770940800004,
  ];

  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'money-flow-migrations-'));
    process.env.BACKUP_DIR = path.join(tmpDir, 'backups');
  });

  afterEach(() => {
    delete process.env.BACKUP_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function runMigrations(dbPath: string): Promise<DataSource> {
    const ds = new DataSource({
      type: 'sqlite',
      database: dbPath,
      entities: [],
      migrations,
    });
    await ds.initialize();
    await ds.runMigrations();
    return ds;
  }

  it('runs on empty database', async () => {
    const dbPath = path.join(tmpDir, 'empty.sqlite');
    const ds = await runMigrations(dbPath);
    const tables = (await ds.query(`SELECT name FROM sqlite_master WHERE type='table'`)) as Array<{
      name: string;
    }>;
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['categories', 'transactions', 'settings', 'migrations']),
    );
    await ds.destroy();
  });

  it('migrates old schema without source/idempotencyKey columns', async () => {
    const dbPath = path.join(tmpDir, 'old.sqlite');
    const seed = new DataSource({ type: 'sqlite', database: dbPath });
    await seed.initialize();
    await seed.query(`
      CREATE TABLE "categories" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL
      )
    `);
    await seed.query(`
      CREATE TABLE "transactions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "categoryId" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "date" date NOT NULL,
        "description" varchar(255)
      )
    `);
    await seed.query(
      `INSERT INTO "categories" ("id","name") VALUES ('11111111-1111-1111-1111-111111111111','Food')`,
    );
    await seed.query(
      `INSERT INTO "transactions" ("id","categoryId","amount","date","description") VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',10.50,'2026-02-14','Lunch')`,
    );
    await seed.destroy();

    const ds = await runMigrations(dbPath);

    const cols = (await ds.query(`PRAGMA table_info("transactions")`)) as Array<{
      name: string;
    }>;
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(['source', 'idempotencyKey', 'amountCents']),
    );

    const rows = (await ds.query(
      `SELECT "source","idempotencyKey","amountCents" FROM "transactions"`,
    )) as Array<{ source: string; idempotencyKey: string | null; amountCents: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('manual');
    expect(rows[0].idempotencyKey).toBeNull();
    expect(rows[0].amountCents).toBe(1050);

    await ds.destroy();
  });

  it('migrates already-cents schema (amountCents exists)', async () => {
    const dbPath = path.join(tmpDir, 'cents.sqlite');
    const seed = new DataSource({ type: 'sqlite', database: dbPath });
    await seed.initialize();
    await seed.query(`
      CREATE TABLE "categories" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL
      )
    `);
    await seed.query(`
      CREATE TABLE "transactions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "source" varchar(32) NOT NULL DEFAULT ('manual'),
        "idempotencyKey" varchar(255),
        "categoryId" uuid NOT NULL,
        "amountCents" integer NOT NULL,
        "date" date NOT NULL,
        "description" varchar(255),
        CONSTRAINT "FK_transactions_categoryId" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await seed.query(`
      CREATE TABLE "recurring_expenses" (
        "id" varchar PRIMARY KEY NOT NULL,
        "categoryId" uuid NOT NULL,
        "amountCents" integer NOT NULL,
        "dayOfMonth" integer NOT NULL,
        "date" date NOT NULL,
        "description" varchar(255),
        CONSTRAINT "FK_recurring_expenses_categoryId" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await seed.query(
      `INSERT INTO "categories" ("id","name") VALUES ('11111111-1111-1111-1111-111111111111','Food')`,
    );
    await seed.query(
      `INSERT INTO "transactions" ("id","source","idempotencyKey","categoryId","amountCents","date","description") VALUES ('22222222-2222-2222-2222-222222222222','manual',NULL,'11111111-1111-1111-1111-111111111111',1050,'2026-02-14','Lunch')`,
    );
    await seed.destroy();

    const ds = await runMigrations(dbPath);
    const rows = (await ds.query(`SELECT "amountCents" FROM "transactions"`)) as Array<{
      amountCents: number;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(1050);
    await ds.destroy();
  });
});
