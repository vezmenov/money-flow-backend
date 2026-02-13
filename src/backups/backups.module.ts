import { Module } from '@nestjs/common';
import { JobLocksModule } from '../job-locks/job-locks.module';
import { BackupsController } from './backups.controller';
import { BackupsProcessor } from './backups.processor';
import { BackupsService } from './backups.service';

@Module({
  imports: [JobLocksModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupsProcessor],
})
export class BackupsModule {}
