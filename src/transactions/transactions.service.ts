import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions.dto';
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
      source: 'manual',
    });
    return this.transactionRepository.save(transaction);
  }

  async findAll(): Promise<Transaction[]> {
    return (await this.findAllWithMeta({})).items;
  }

  async findAllWithMeta(
    query: ListTransactionsQueryDto,
  ): Promise<{ items: Transaction[]; total: number }> {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be <= to');
    }

    const qb = this.transactionRepository.createQueryBuilder('t');
    if (query.from) {
      qb.andWhere('t.date >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('t.date <= :to', { to: query.to });
    }
    if (query.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.source) {
      qb.andWhere('t.source = :source', { source: query.source });
    }

    qb.orderBy('t.date', 'DESC').skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
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
