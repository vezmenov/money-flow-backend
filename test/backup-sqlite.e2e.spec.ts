import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gunzipSync } from 'node:zlib';
import request = require('supertest');
import { BackupsModule } from '../src/backups/backups.module';

function binaryParser(res: any, callback: (err: Error | null, data: Buffer) => void): void {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
}

describe('SQLite backup', () => {
  let app: INestApplication;
  const apiKey = 'appkey';

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'money-flow-backup-'));
  const dbPath = path.join(tmpRoot, 'db.sqlite');
  const backupDir = path.join(tmpRoot, 'backups');

  beforeAll(async () => {
    process.env.APP_API_KEY = apiKey;
    process.env.DB_PATH = dbPath;
    process.env.BACKUP_DIR = backupDir;
    process.env.BACKUP_RETENTION_DAYS = '30';

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: dbPath,
          synchronize: true,
          dropSchema: true,
          entities: [],
        }),
        BackupsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    delete process.env.APP_API_KEY;
    delete process.env.DB_PATH;
    delete process.env.BACKUP_DIR;
    delete process.env.BACKUP_RETENTION_DAYS;

    await app.close();

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('requires x-api-key', async () => {
    await request(app.getHttpServer()).get('/api/backup/sqlite').expect(401);
  });

  it('returns a gzip SQLite file', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/backup/sqlite')
      .set('x-api-key', apiKey)
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
      .expect('Content-Type', /application\/gzip/);

    expect(resp.headers['content-disposition']).toMatch(
      /attachment; filename="money-flow-backup-.*\.sqlite\.gz"/,
    );

    const gz = resp.body as Buffer;
    const raw = gunzipSync(gz);

    expect(raw.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
  });
});
