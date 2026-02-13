import type { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class AmountCents202602130002 implements MigrationInterface {
  name = 'AmountCents202602130002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create a pre-migration snapshot, so a failed migration doesn't brick your data.
    await backupSqlite(queryRunner, 'amount-cents');

    // Transactions: amount(decimal) -> amountCents(integer)
    await queryRunner.query(`ALTER TABLE "transactions" RENAME TO "transactions_old"`);
    await queryRunner.query(`
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
    await queryRunner.query(`
      INSERT INTO "transactions" ("id","source","idempotencyKey","categoryId","amountCents","date","description")
      SELECT
        "id",
        "source",
        "idempotencyKey",
        "categoryId",
        CAST(ROUND(CAST("amount" AS REAL) * 100.0) AS INTEGER) AS "amountCents",
        "date",
        "description"
      FROM "transactions_old"
    `);
    await queryRunner.query(`DROP TABLE "transactions_old"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transactions_source_idempotencyKey"
      ON "transactions" ("source", "idempotencyKey")
    `);

    // Recurring expenses: amount(decimal) -> amountCents(integer)
    await queryRunner.query(`ALTER TABLE "recurring_expenses" RENAME TO "recurring_expenses_old"`);
    await queryRunner.query(`
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
    await queryRunner.query(`
      INSERT INTO "recurring_expenses" ("id","categoryId","amountCents","dayOfMonth","date","description")
      SELECT
        "id",
        "categoryId",
        CAST(ROUND(CAST("amount" AS REAL) * 100.0) AS INTEGER) AS "amountCents",
        "dayOfMonth",
        "date",
        "description"
      FROM "recurring_expenses_old"
    `);
    await queryRunner.query(`DROP TABLE "recurring_expenses_old"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse to decimal columns.
    await queryRunner.query(`ALTER TABLE "transactions" RENAME TO "transactions_new"`);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "source" varchar(32) NOT NULL DEFAULT ('manual'),
        "idempotencyKey" varchar(255),
        "categoryId" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "date" date NOT NULL,
        "description" varchar(255),
        CONSTRAINT "FK_transactions_categoryId" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "transactions" ("id","source","idempotencyKey","categoryId","amount","date","description")
      SELECT
        "id",
        "source",
        "idempotencyKey",
        "categoryId",
        ("amountCents" / 100.0) AS "amount",
        "date",
        "description"
      FROM "transactions_new"
    `);
    await queryRunner.query(`DROP TABLE "transactions_new"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transactions_source_idempotencyKey"
      ON "transactions" ("source", "idempotencyKey")
    `);

    await queryRunner.query(`ALTER TABLE "recurring_expenses" RENAME TO "recurring_expenses_new"`);
    await queryRunner.query(`
      CREATE TABLE "recurring_expenses" (
        "id" varchar PRIMARY KEY NOT NULL,
        "categoryId" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "dayOfMonth" integer NOT NULL,
        "date" date NOT NULL,
        "description" varchar(255),
        CONSTRAINT "FK_recurring_expenses_categoryId" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "recurring_expenses" ("id","categoryId","amount","dayOfMonth","date","description")
      SELECT
        "id",
        "categoryId",
        ("amountCents" / 100.0) AS "amount",
        "dayOfMonth",
        "date",
        "description"
      FROM "recurring_expenses_new"
    `);
    await queryRunner.query(`DROP TABLE "recurring_expenses_new"`);
  }
}

async function backupSqlite(queryRunner: QueryRunner, label: string): Promise<void> {
  const backupDir = process.env.BACKUP_DIR ?? 'data/backups';
  fs.mkdirSync(backupDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(backupDir, `pre-migration-${label}-${ts}.sqlite`);
  const escaped = outPath.replace(/'/g, "''");

  try {
    await queryRunner.query(`VACUUM INTO '${escaped}'`);
    return;
  } catch (e) {
    // VACUUM INTO is the safest option. If it's not available, try a best-effort file copy.
    const dbList = (await queryRunner.query(`PRAGMA database_list`)) as Array<{
      name?: string;
      file?: string;
    }>;
    const main = dbList?.find((r) => r.name === 'main');
    const dbFile = main?.file;
    if (dbFile && dbFile !== ':memory:') {
      fs.copyFileSync(dbFile, outPath);
      return;
    }
    throw e;
  }
}
