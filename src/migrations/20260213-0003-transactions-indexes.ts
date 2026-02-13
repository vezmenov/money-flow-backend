import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionsIndexes202602130003 implements MigrationInterface {
  name = 'TransactionsIndexes202602130003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_date" ON "transactions" ("date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_categoryId" ON "transactions" ("categoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_source" ON "transactions" ("source")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_categoryId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_date"`);
  }
}
