import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(payload: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...payload,
    });
    return this.transactionRepository.save(transaction);
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      order: { date: 'DESC' },
    });
  }

  async update(id: string, payload: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionRepository.preload({ id, ...payload });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string): Promise<void> {
    const result = await this.transactionRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Transaction not found');
    }
  }
}
