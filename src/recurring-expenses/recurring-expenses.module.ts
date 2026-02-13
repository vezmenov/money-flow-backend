import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { SettingsModule } from '../settings/settings.module';
import { Transaction } from '../transactions/transaction.entity';
import { RecurringExpense } from './recurring-expense.entity';
import { RecurringExpensesController } from './recurring-expenses.controller';
import { RecurringExpensesProcessor } from './recurring-expenses.processor';
import { RecurringExpensesService } from './recurring-expenses.service';
import { RecurringProcessingState } from './recurring-processing-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringExpense,
      RecurringProcessingState,
      Category,
      Transaction,
    ]),
    SettingsModule,
  ],
  controllers: [RecurringExpensesController],
  providers: [RecurringExpensesService, RecurringExpensesProcessor],
  exports: [RecurringExpensesService],
})
export class RecurringExpensesModule {}

