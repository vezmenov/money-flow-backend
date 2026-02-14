import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';
import { CreateRecurringExpenseDto } from '../recurring-expenses/dto/create-recurring-expense.dto';
import { ListRecurringExpensesQueryDto } from '../recurring-expenses/dto/list-recurring-expenses.dto';
import { RecurringExpense } from '../recurring-expenses/recurring-expense.entity';
import {
  RecurringExpenseForMonth,
  RecurringExpensesService,
} from '../recurring-expenses/recurring-expenses.service';
import { Transaction } from '../transactions/transaction.entity';
import { OpenClawImportTransactionsDto } from './dto/openclaw-import-transactions.dto';
import { OpenClawApiKeyGuard } from './guards/openclaw-api-key.guard';
import { OpenClawImportResult, OpenClawService } from './openclaw.service';

@Controller('openclaw/v1')
@UseGuards(OpenClawApiKeyGuard)
export class OpenClawController {
  constructor(
    private readonly openClawService: OpenClawService,
    private readonly categoriesService: CategoriesService,
    private readonly recurringExpensesService: RecurringExpensesService,
  ) {}

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Get('categories')
  async listCategories(): Promise<Category[]> {
    return this.openClawService.listCategories();
  }

  @Post('categories')
  async createCategory(@Body() payload: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(payload);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, payload);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  async removeCategory(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }

  @Post('transactions/import')
  @HttpCode(200)
  async importTransactions(
    @Body() payload: OpenClawImportTransactionsDto,
  ): Promise<{ results: OpenClawImportResult[] }> {
    const results = await this.openClawService.importTransactions(payload.transactions);
    return { results };
  }

  @Get('transactions/:idempotencyKey')
  async getTransaction(@Param('idempotencyKey') idempotencyKey: string): Promise<Transaction> {
    return this.openClawService.getTransactionByIdempotencyKey(idempotencyKey);
  }

  @Delete('transactions/:idempotencyKey')
  @HttpCode(204)
  async removeTransaction(@Param('idempotencyKey') idempotencyKey: string): Promise<void> {
    return this.openClawService.removeTransactionByIdempotencyKey(idempotencyKey);
  }

  @Get('recurring-expenses')
  async listRecurringExpenses(
    @Query() query: ListRecurringExpensesQueryDto,
  ): Promise<RecurringExpenseForMonth[]> {
    return this.recurringExpensesService.listForMonth(query.month);
  }

  @Post('recurring-expenses')
  async createRecurringExpense(
    @Body() payload: CreateRecurringExpenseDto,
  ): Promise<RecurringExpense> {
    return this.recurringExpensesService.create(payload);
  }

  @Delete('recurring-expenses/:id')
  @HttpCode(204)
  async removeRecurringExpense(@Param('id') id: string): Promise<void> {
    return this.recurringExpensesService.remove(id);
  }
}
