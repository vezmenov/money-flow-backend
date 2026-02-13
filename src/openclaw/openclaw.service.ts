import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { OpenClawUpsertTransactionDto } from './dto/openclaw-upsert-transaction.dto';

export type OpenClawImportAction = 'created' | 'updated';

export interface OpenClawImportResult {
  idempotencyKey: string;
  action: OpenClawImportAction;
  transaction: Transaction;
  category: Category;
}

@Injectable()
export class OpenClawService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async listCategories(): Promise<Category[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async importTransactions(
    transactions: OpenClawUpsertTransactionDto[],
  ): Promise<OpenClawImportResult[]> {
    const results: OpenClawImportResult[] = [];

    for (const payload of transactions) {
      const idempotencyKey = payload.idempotencyKey.trim();
      if (!idempotencyKey) {
        throw new BadRequestException('idempotencyKey must not be empty');
      }

      const category = await this.findOrCreateCategoryByName(payload.categoryName);
      const existing = await this.transactionRepository.findOne({
        where: { source: 'openclaw', idempotencyKey },
      });

      if (!existing) {
        try {
          const created = this.transactionRepository.create({
            source: 'openclaw',
            idempotencyKey,
            categoryId: category.id,
            amount: payload.amount,
            date: payload.date,
            description: payload.description ?? null,
          });
          const saved = await this.transactionRepository.save(created);
          results.push({
            idempotencyKey,
            action: 'created',
            transaction: saved,
            category,
          });
          continue;
        } catch (error) {
          // If we lost a race on the UNIQUE(source, idempotencyKey), treat it as an update.
          if (error instanceof QueryFailedError) {
            const raced = await this.transactionRepository.findOne({
              where: { source: 'openclaw', idempotencyKey },
            });
            if (raced) {
              const saved = await this.updateExistingTransaction(raced, payload, category.id);
              results.push({
                idempotencyKey,
                action: 'updated',
                transaction: saved,
                category,
              });
              continue;
            }
          }
          throw error;
        }
      }

      const saved = await this.updateExistingTransaction(existing, payload, category.id);
      results.push({
        idempotencyKey,
        action: 'updated',
        transaction: saved,
        category,
      });
    }

    return results;
  }

  async getTransactionByIdempotencyKey(idempotencyKey: string): Promise<Transaction> {
    const key = idempotencyKey.trim();
    const transaction = await this.transactionRepository.findOne({
      where: { source: 'openclaw', idempotencyKey: key },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async removeTransactionByIdempotencyKey(idempotencyKey: string): Promise<void> {
    const key = idempotencyKey.trim();
    const result = await this.transactionRepository.delete({
      source: 'openclaw',
      idempotencyKey: key,
    });
    if (!result.affected) {
      throw new NotFoundException('Transaction not found');
    }
  }

  private async updateExistingTransaction(
    existing: Transaction,
    payload: OpenClawUpsertTransactionDto,
    categoryId: string,
  ): Promise<Transaction> {
    existing.categoryId = categoryId;
    existing.amount = payload.amount;
    existing.date = payload.date;
    if (payload.description !== undefined) {
      existing.description = payload.description;
    }
    return this.transactionRepository.save(existing);
  }

  private normalizeCategoryName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private async findOrCreateCategoryByName(categoryName: string): Promise<Category> {
    const normalized = this.normalizeCategoryName(categoryName);
    if (!normalized) {
      throw new BadRequestException('categoryName must not be empty');
    }

    const existing = await this.categoryRepository
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name: normalized })
      .getOne();
    if (existing) {
      return existing;
    }

    const created = this.categoryRepository.create({ name: normalized });
    return this.categoryRepository.save(created);
  }
}
