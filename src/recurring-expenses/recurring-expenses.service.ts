import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { SettingsService } from '../settings/settings.service';
import { Transaction } from '../transactions/transaction.entity';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { RecurringExpense } from './recurring-expense.entity';

export interface RecurringExpenseForMonth {
  id: string;
  categoryId: string;
  amount: number;
  dayOfMonth: number;
  date: string;
  description?: string | null;
  scheduledDate: string;
  committed: boolean;
}

@Injectable()
export class RecurringExpensesService {
  constructor(
    @InjectRepository(RecurringExpense)
    private readonly recurringExpenseRepository: Repository<RecurringExpense>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly settingsService: SettingsService,
  ) {}

  async create(payload: CreateRecurringExpenseDto): Promise<RecurringExpense> {
    const category = await this.categoryRepository.findOneBy({ id: payload.categoryId });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const { day } = parseDateParts(payload.date);
    if (day !== payload.dayOfMonth) {
      throw new BadRequestException('dayOfMonth must match day(date)');
    }

    const recurringExpense = this.recurringExpenseRepository.create({
      categoryId: payload.categoryId,
      amount: payload.amount,
      dayOfMonth: payload.dayOfMonth,
      date: payload.date,
      description: payload.description ?? null,
    });

    return this.recurringExpenseRepository.save(recurringExpense);
  }

  async remove(id: string): Promise<void> {
    const result = await this.recurringExpenseRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Recurring expense not found');
    }
  }

  async listForMonth(month?: string): Promise<RecurringExpenseForMonth[]> {
    const { year, month1to12 } = await this.resolveYearMonth(month);
    const lastDay = daysInMonth(year, month1to12);

    const recurring = await this.recurringExpenseRepository.find({
      order: { dayOfMonth: 'ASC' },
    });

    const items: RecurringExpenseForMonth[] = [];
    const keys: string[] = [];

    for (const r of recurring) {
      const scheduledDay = Math.min(r.dayOfMonth, lastDay);
      const scheduledDate = formatDate(year, month1to12, scheduledDay);
      if (scheduledDate < r.date) {
        continue;
      }

      const key = recurringTransactionIdempotencyKey(r.id, scheduledDate);
      keys.push(key);

      items.push({
        id: r.id,
        categoryId: r.categoryId,
        amount: r.amount,
        dayOfMonth: r.dayOfMonth,
        date: r.date,
        description: r.description ?? null,
        scheduledDate,
        committed: false,
      });
    }

    if (keys.length) {
      const existing = await this.transactionRepository.find({
        select: ['idempotencyKey'],
        where: { source: 'recurring', idempotencyKey: In(keys) },
      });

      const committedKeys = new Set(
        existing.map((t) => t.idempotencyKey).filter((k): k is string => Boolean(k)),
      );
      for (const item of items) {
        const key = recurringTransactionIdempotencyKey(item.id, item.scheduledDate);
        item.committed = committedKeys.has(key);
      }
    }

    return items;
  }

  async getLocalNow(): Promise<Date> {
    const offsetMinutes = await this.settingsService.getUtcOffsetMinutes();
    const utcNowMs = Date.now();
    return new Date(utcNowMs + offsetMinutes * 60_000);
  }

  private async resolveYearMonth(
    month: string | undefined,
  ): Promise<{ year: number; month1to12: number }> {
    if (month) {
      const match = month.match(/^(\d{4})-(\d{2})$/);
      if (!match) {
        throw new BadRequestException('month must be in YYYY-MM format');
      }
      const year = Number(match[1]);
      const month1to12 = Number(match[2]);
      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month1to12) ||
        month1to12 < 1 ||
        month1to12 > 12
      ) {
        throw new BadRequestException('month must be in YYYY-MM format');
      }
      return { year, month1to12 };
    }

    const localNow = await this.getLocalNow();
    const year = localNow.getUTCFullYear();
    const month1to12 = localNow.getUTCMonth() + 1;
    return { year, month1to12 };
  }
}

export function recurringTransactionIdempotencyKey(
  recurringExpenseId: string,
  date: string,
): string {
  return `recurring:${recurringExpenseId}:${date}`;
}

function parseDateParts(date: string): { year: number; month1to12: number; day: number } {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new BadRequestException('date must be in YYYY-MM-DD format');
  }

  const year = Number(match[1]);
  const month1to12 = Number(match[2]);
  const day = Number(match[3]);

  return { year, month1to12, day };
}

function formatDate(year: number, month1to12: number, day: number): string {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month1to12).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}
