import type { MigrationInterface, QueryRunner } from 'typeorm';

const PALETTE = ['#3b82f6', '#10b981', '#60a5fa', '#a78bfa', '#34d399', '#f87171'];

export class CategoriesColorType1771027200005 implements MigrationInterface {
  name = 'CategoriesColorType1771027200005';

  async up(queryRunner: QueryRunner): Promise<void> {
    const cols = await getTableColumns(queryRunner, 'categories');

    if (!cols.has('type')) {
      await queryRunner.query(
        `ALTER TABLE "categories" ADD COLUMN "type" varchar(16) NOT NULL DEFAULT ('expense')`,
      );
    }

    if (!cols.has('color')) {
      await queryRunner.query(
        `ALTER TABLE "categories" ADD COLUMN "color" varchar(16) NOT NULL DEFAULT ('#3b82f6')`,
      );
    }

    // Normalize type values.
    await queryRunner.query(`
      UPDATE "categories"
      SET "type" = 'expense'
      WHERE "type" IS NULL OR "type" NOT IN ('expense','income')
    `);

    // Backfill colors for existing rows. Historically backend didn't store color at all,
    // so everything looked identical in UI. Make it deterministic but not random.
    const rows = (await queryRunner.query(
      `SELECT "id", "name", "color" FROM "categories"`,
    )) as Array<{ id?: string; name?: string; color?: string }>;

    for (const row of rows) {
      const id = String(row.id ?? '').trim();
      if (!id) {
        continue;
      }
      const current = String(row.color ?? '').trim();

      // If it's empty or still the default, give it a palette color.
      if (!current || current === '#3b82f6') {
        const idx = stableHash(id) % PALETTE.length;
        const nextColor = PALETTE[idx]!;
        await queryRunner.query(`UPDATE "categories" SET "color" = ? WHERE "id" = ?`, [
          nextColor,
          id,
        ]);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite can't DROP COLUMN; rebuild the table.
    await queryRunner.query('PRAGMA foreign_keys=OFF');
    await queryRunner.query(`ALTER TABLE "categories" RENAME TO "categories_old"`);
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "categories" ("id","name")
      SELECT "id","name" FROM "categories_old"
    `);
    await queryRunner.query(`DROP TABLE "categories_old"`);
    await queryRunner.query('PRAGMA foreign_keys=ON');
  }
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

async function getTableColumns(queryRunner: QueryRunner, table: string): Promise<Set<string>> {
  const rows = (await queryRunner.query(`PRAGMA table_info("${table}")`)) as Array<{
    name?: string;
  }>;
  return new Set(rows.map((r) => r.name).filter((n): n is string => Boolean(n)));
}
