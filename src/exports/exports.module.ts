import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { RecurringExpense } from '../recurring-expenses/recurring-expense.entity';
import { Transaction } from '../transactions/transaction.entity';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Transaction, RecurringExpense])],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
