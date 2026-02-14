import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1770940800001 implements MigrationInterface {
  name = 'Baseline1770940800001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Baseline schema. Uses IF NOT EXISTS to be safe for existing DBs created by synchronize:true.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" integer PRIMARY KEY NOT NULL,
        "utcOffset" varchar(6) NOT NULL DEFAULT ('+03:00')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_processing_state" (
        "id" integer PRIMARY KEY NOT NULL,
        "lastProcessedDate" date
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_expenses" (
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
      CREATE TABLE IF NOT EXISTS "transactions" (
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

    // If DB existed before "source"/"idempotencyKey" fields were introduced,
    // we need to add the columns before creating the composite unique index.
    const txCols = await getTableColumns(queryRunner, 'transactions');
    if (!txCols.has('source')) {
      await queryRunner.query(
        `ALTER TABLE "transactions" ADD COLUMN "source" varchar(32) NOT NULL DEFAULT ('manual')`,
      );
    }

    const hasExternalId = txCols.has('externalId');
    const hasIdempotencyKey = txCols.has('idempotencyKey');
    if (!hasIdempotencyKey) {
      await queryRunner.query(
        `ALTER TABLE "transactions" ADD COLUMN "idempotencyKey" varchar(255)`,
      );
      if (hasExternalId) {
        // Preserve historical idempotency keys if we used "externalId" earlier.
        await queryRunner.query(
          `UPDATE "transactions" SET "idempotencyKey" = "externalId" WHERE "idempotencyKey" IS NULL`,
        );
      }
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transactions_source_idempotencyKey"
      ON "transactions" ("source", "idempotencyKey")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_source_idempotencyKey"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_processing_state"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}

async function getTableColumns(queryRunner: QueryRunner, table: string): Promise<Set<string>> {
  const rows = (await queryRunner.query(`PRAGMA table_info("${table}")`)) as Array<{
    name?: string;
  }>;
  return new Set(rows.map((r) => r.name).filter((n): n is string => Boolean(n)));
}
