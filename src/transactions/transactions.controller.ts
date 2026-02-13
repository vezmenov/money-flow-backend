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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './transaction.entity';
import { AppApiKeyGuard } from '../auth/app-api-key.guard';

@Controller('transactions')
@UseGuards(AppApiKeyGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(
    @Query() query: ListTransactionsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Transaction[]> {
    const { items, total } = await this.transactionsService.findAllWithMeta(query);
    res.setHeader('X-Total-Count', String(total));
    return items;
  }

  @Post()
  async create(@Body() payload: CreateTransactionDto): Promise<Transaction> {
    return this.transactionsService.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, payload);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.transactionsService.remove(id);
  }
}
