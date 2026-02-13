import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { ListRecurringExpensesQueryDto } from './dto/list-recurring-expenses.dto';
import { RecurringExpenseForMonth, RecurringExpensesService } from './recurring-expenses.service';
import { RecurringExpense } from './recurring-expense.entity';

@Controller('recurring-expenses')
export class RecurringExpensesController {
  constructor(private readonly recurringExpensesService: RecurringExpensesService) {}

  @Get()
  async listForMonth(
    @Query() query: ListRecurringExpensesQueryDto,
  ): Promise<RecurringExpenseForMonth[]> {
    return this.recurringExpensesService.listForMonth(query.month);
  }

  @Post()
  async create(@Body() payload: CreateRecurringExpenseDto): Promise<RecurringExpense> {
    return this.recurringExpensesService.create(payload);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.recurringExpensesService.remove(id);
  }
}
