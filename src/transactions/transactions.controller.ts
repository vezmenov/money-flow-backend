import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './transaction.entity';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(): Promise<Transaction[]> {
    return this.transactionsService.findAll();
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
  async remove(@Param('id') id: string): Promise<void> {
    return this.transactionsService.remove(id);
  }
}
