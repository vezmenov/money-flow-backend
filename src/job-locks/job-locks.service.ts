import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as os from 'node:os';

@Injectable()
export class JobLocksService {
  private readonly instanceId: string;

  constructor(private readonly dataSource: DataSource) {
    const envId = process.env.INSTANCE_ID?.trim();
    this.instanceId = envId && envId.length ? envId : `${os.hostname()}:${process.pid}`;
  }

  async acquire(name: string, ttlMs: number): Promise<boolean> {
    const lockName = name.trim();
    if (!lockName) {
      throw new Error('Job lock name must be non-empty');
    }
    if (ttlMs <= 0) {
      throw new Error('Job lock ttlMs must be > 0');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const untilSec = nowSec + Math.ceil(ttlMs / 1000);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      const result = (await qr.query(
        `
INSERT INTO "job_locks" ("name", "lockedUntil", "lockedBy")
VALUES (?, ?, ?)
ON CONFLICT("name") DO UPDATE
  SET "lockedUntil" = excluded."lockedUntil",
      "lockedBy" = excluded."lockedBy"
WHERE "job_locks"."lockedUntil" <= ?
        `.trim(),
        [lockName, untilSec, this.instanceId, nowSec],
        true,
      )) as { affected?: number };

      return Number(result.affected ?? 0) > 0;
    } finally {
      await qr.release();
    }
  }
}
