import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  async getReady(): Promise<{ status: string }> {
    // DB ping. If the connection is dead/misconfigured, this will throw and readiness will be 500.
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
