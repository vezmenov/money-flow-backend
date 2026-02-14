import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { BackupsService } from '../src/backups/backups.service';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'money-flow-backups-service-'));
}

describe('BackupsService', () => {
  const savedEnv = {
    DB_PATH: process.env.DB_PATH,
    BACKUP_DIR: process.env.BACKUP_DIR,
    BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) {
        delete (process.env as any)[k];
      } else {
        (process.env as any)[k] = v;
      }
    }
  });

  it('throws when DB_PATH is :memory:', async () => {
    process.env.DB_PATH = ':memory:';
    process.env.BACKUP_DIR = makeTmpDir();

    const dataSource = { query: jest.fn(), options: { database: ':memory:' } } as any;
    const service = new BackupsService(dataSource);

    await expect(service.createSqliteGzipBackup()).rejects.toThrow(
      'DB_PATH is ":memory:"; sqlite file backup is not supported',
    );
  });

  it('falls back to file copy when VACUUM INTO fails', async () => {
    const tmp = makeTmpDir();
    const dbPath = path.join(tmp, 'db.sqlite');
    const backupDir = path.join(tmp, 'backups');

    fs.writeFileSync(dbPath, Buffer.from('SQLite format 3', 'utf8'));

    process.env.DB_PATH = dbPath;
    process.env.BACKUP_DIR = backupDir;
    process.env.BACKUP_RETENTION_DAYS = '0';

    const dataSource = {
      query: jest.fn(async () => {
        throw new Error('no vacuum');
      }),
      options: { database: dbPath },
    } as any;
    const service = new BackupsService(dataSource);

    const { filePath } = await service.createSqliteGzipBackup();
    expect(filePath.endsWith('.sqlite.gz')).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);

    const raw = gunzipSync(fs.readFileSync(filePath));
    expect(raw.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
  });

  it('uses VACUUM INTO when available', async () => {
    const tmp = makeTmpDir();
    const backupDir = path.join(tmp, 'backups');

    process.env.DB_PATH = path.join(tmp, 'db.sqlite');
    process.env.BACKUP_DIR = backupDir;
    process.env.BACKUP_RETENTION_DAYS = '0';

    const dataSource = {
      query: jest.fn(async (sql: string) => {
        const m = sql.match(/VACUUM INTO '(.+)'/);
        if (!m) {
          throw new Error('unexpected query');
        }
        const outPath = m[1].replace(/''/g, "'");
        fs.writeFileSync(outPath, Buffer.from('SQLite format 3', 'utf8'));
      }),
      options: { database: process.env.DB_PATH },
    } as any;
    const service = new BackupsService(dataSource);

    const { filePath } = await service.createSqliteGzipBackup();
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('cleanupOldBackups deletes old .sqlite.gz and ignores other entries', async () => {
    const tmp = makeTmpDir();
    const backupDir = path.join(tmp, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    fs.mkdirSync(path.join(backupDir, 'subdir'));
    fs.writeFileSync(path.join(backupDir, 'note.txt'), 'x');

    const oldPath = path.join(backupDir, 'old.sqlite.gz');
    fs.writeFileSync(oldPath, 'x');
    const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldPath, oldTime, oldTime);

    const dataSource = { query: jest.fn(), options: {} } as any;
    const service = new BackupsService(dataSource);

    await (service as any).cleanupOldBackups(backupDir, 1);

    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(path.join(backupDir, 'note.txt'))).toBe(true);
    expect(fs.existsSync(path.join(backupDir, 'subdir'))).toBe(true);
  });
});
