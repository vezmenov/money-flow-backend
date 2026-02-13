import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline202602130001 implements MigrationInterface {
  name = 'Baseline202602130001';

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
