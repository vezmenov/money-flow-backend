import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobLock } from './job-lock.entity';
import { JobLocksService } from './job-locks.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobLock])],
  providers: [JobLocksService],
  exports: [JobLocksService],
})
export class JobLocksModule {}
