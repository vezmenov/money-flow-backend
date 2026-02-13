import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';
import { JobLocksService } from '../job-locks/job-locks.service';
import { BackupsService } from './backups.service';

@Injectable()
export class BackupsProcessor {
  private readonly logger = new Logger(BackupsProcessor.name);

  constructor(
    private readonly backupsService: BackupsService,
    private readonly jobLocksService: JobLocksService,
    private readonly alertsService: AlertsService,
  ) {}

  // Runs daily. The exact time isn't critical for a single-user setup.
  @Cron('0 2 * * *')
  async tick(): Promise<void> {
    const acquired = await this.jobLocksService.acquire('sqlite-backup', 2 * 60 * 60_000);
    if (!acquired) {
      return;
    }

    try {
      const { fileName } = await this.backupsService.createSqliteGzipBackup();
      this.logger.log(`Created SQLite backup: ${fileName}`);
    } catch (err) {
      const msg = `SQLite backup failed: ${String(err)}`;
      this.logger.error(msg);
      await this.alertsService.alert(msg);
    }
  }
}
