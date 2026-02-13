import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { OpenClawController } from './openclaw.controller';
import { OpenClawService } from './openclaw.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Transaction])],
  controllers: [OpenClawController],
  providers: [OpenClawService],
})
export class OpenClawModule {}

