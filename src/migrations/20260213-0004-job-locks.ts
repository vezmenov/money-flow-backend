import type { MigrationInterface, QueryRunner } from 'typeorm';

export class JobLocks1770940800004 implements MigrationInterface {
  name = 'JobLocks1770940800004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_locks" (
        "name" varchar PRIMARY KEY NOT NULL,
        "lockedUntil" integer NOT NULL DEFAULT 0,
        "lockedBy" varchar NOT NULL DEFAULT ''
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_locks"`);
  }
}
