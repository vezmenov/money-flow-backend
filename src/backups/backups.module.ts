import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { JobLocksModule } from '../job-locks/job-locks.module';
import { BackupsController } from './backups.controller';
import { BackupsProcessor } from './backups.processor';
import { BackupsService } from './backups.service';

@Module({
  imports: [JobLocksModule, AlertsModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupsProcessor],
})
export class BackupsModule {}
