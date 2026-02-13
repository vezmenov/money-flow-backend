import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { OpenClawImportTransactionsDto } from './dto/openclaw-import-transactions.dto';
import { OpenClawApiKeyGuard } from './guards/openclaw-api-key.guard';
import { OpenClawImportResult, OpenClawService } from './openclaw.service';

@Controller('openclaw/v1')
@UseGuards(OpenClawApiKeyGuard)
export class OpenClawController {
  constructor(private readonly openClawService: OpenClawService) {}

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Get('categories')
  async listCategories(): Promise<Category[]> {
    return this.openClawService.listCategories();
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
  async getTransaction(
    @Param('idempotencyKey') idempotencyKey: string,
  ): Promise<Transaction> {
    return this.openClawService.getTransactionByIdempotencyKey(idempotencyKey);
  }

  @Delete('transactions/:idempotencyKey')
  @HttpCode(204)
  async removeTransaction(
    @Param('idempotencyKey') idempotencyKey: string,
  ): Promise<void> {
    return this.openClawService.removeTransactionByIdempotencyKey(idempotencyKey);
  }
}
