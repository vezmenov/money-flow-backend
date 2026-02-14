import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async createSqliteGzipBackup(): Promise<{ filePath: string; fileName: string }> {
    const dbPath = this.getDbPath();
    if (dbPath === ':memory:') {
      throw new Error('DB_PATH is ":memory:"; sqlite file backup is not supported');
    }

    const backupDir = process.env.BACKUP_DIR?.trim() || 'data/backups';
    const retentionDays = parsePositiveInt(process.env.BACKUP_RETENTION_DAYS, 30);

    await fsp.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawName = `money-flow-backup-${timestamp}.sqlite`;
    const rawPath = path.join(backupDir, rawName);
    const gzPath = `${rawPath}.gz`;
    const gzName = path.basename(gzPath);

    await this.snapshotSqliteToFile(rawPath);

    await pipeline(
      fs.createReadStream(rawPath),
      createGzip({ level: 9 }),
      fs.createWriteStream(gzPath),
    );
    await fsp.unlink(rawPath).catch(() => undefined);

    await this.cleanupOldBackups(backupDir, retentionDays);

    return { filePath: gzPath, fileName: gzName };
  }

  private getDbPath(): string {
    const fromEnv = process.env.DB_PATH?.trim();
    if (fromEnv) {
      return fromEnv;
    }

    const opt = this.dataSource.options as any;
    return (typeof opt?.database === 'string' && opt.database) || 'data/database.sqlite';
  }

  private async snapshotSqliteToFile(outPath: string): Promise<void> {
    // `VACUUM INTO` creates a consistent snapshot. If it's not supported by the SQLite build,
    // fall back to copying the file from disk.
    const escaped = outPath.replace(/'/g, "''");
    try {
      await this.dataSource.query(`VACUUM INTO '${escaped}'`);
    } catch (err) {
      this.logger.warn(`VACUUM INTO failed (${String(err)}). Falling back to file copy.`);
      const dbPath = this.getDbPath();
      await fsp.copyFile(dbPath, outPath);
    }
  }

  private async cleanupOldBackups(backupDir: string, retentionDays: number): Promise<void> {
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      return;
    }

    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await fsp.readdir(backupDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.sqlite.gz')) continue;

      const fullPath = path.join(backupDir, entry.name);
      const stat = await fsp.stat(fullPath).catch(() => null);
      if (!stat) continue;

      if (stat.mtimeMs < cutoffMs) {
        await fsp.unlink(fullPath).catch(() => undefined);
      }
    }
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt((value ?? '').trim(), 10);
  // Allow 0 to disable cleanup.
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}
