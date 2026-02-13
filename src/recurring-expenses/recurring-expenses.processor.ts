import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsService } from '../alerts/alerts.service';
import { JobLocksService } from '../job-locks/job-locks.service';
import { SettingsService } from '../settings/settings.service';
import { Transaction } from '../transactions/transaction.entity';
import { RecurringExpense } from './recurring-expense.entity';
import { RecurringProcessingState } from './recurring-processing-state.entity';
import { recurringTransactionIdempotencyKey } from './recurring-expenses.service';

@Injectable()
export class RecurringExpensesProcessor {
  private running = false;

  constructor(
    @InjectRepository(RecurringExpense)
    private readonly recurringExpenseRepository: Repository<RecurringExpense>,
    @InjectRepository(RecurringProcessingState)
    private readonly stateRepository: Repository<RecurringProcessingState>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly settingsService: SettingsService,
    private readonly jobLocksService: JobLocksService,
    private readonly alertsService: AlertsService,
  ) {}

  @Cron('*/5 * * * *')
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    const acquired = await this.jobLocksService.acquire('recurring-expenses', 30 * 60_000);
    if (!acquired) {
      return;
    }

    this.running = true;
    try {
      try {
        const offsetMinutes = await this.settingsService.getUtcOffsetMinutes();
        const localNow = new Date(Date.now() + offsetMinutes * 60_000);

        const localHour = localNow.getUTCHours();
        const localMinute = localNow.getUTCMinutes();
        const localDate = formatDateFromUtcDate(localNow);

        const processToday = localHour > 23 || (localHour === 23 && localMinute >= 55);
        const maxDateToProcess = processToday ? localDate : addDays(localDate, -1);

        // When it's early and we have nothing to process yet (e.g. first run before end-of-day),
        // maxDateToProcess can still be a valid date (yesterday). We'll handle it normally.
        const state = await this.ensureStateRow();
        const startDate = state.lastProcessedDate
          ? addDays(state.lastProcessedDate, 1)
          : maxDateToProcess;

        if (startDate > maxDateToProcess) {
          return;
        }

        for (let d = startDate; d <= maxDateToProcess; d = addDays(d, 1)) {
          await this.processDate(d);
        }

        state.lastProcessedDate = maxDateToProcess;
        await this.stateRepository.save(state);
      } catch (err) {
        await this.alertsService.alert(`Recurring expenses processor failed: ${String(err)}`);
        throw err;
      }
    } finally {
      this.running = false;
    }
  }

  private async processDate(date: string): Promise<void> {
    const { year, month1to12, day } = parseDateParts(date);
    const lastDay = daysInMonth(year, month1to12);
    const isLastDayOfMonth = day === lastDay;

    const qb = this.recurringExpenseRepository
      .createQueryBuilder('r')
      .where('r.date <= :date', { date });

    if (isLastDayOfMonth) {
      // If the month is short, shift 29/30/31 to the last day.
      qb.andWhere('r.dayOfMonth >= :day', { day });
    } else {
      qb.andWhere('r.dayOfMonth = :day', { day });
    }

    const due = await qb.getMany();
    if (!due.length) {
      return;
    }

    const values = due.map((r) => ({
      source: 'recurring',
      idempotencyKey: recurringTransactionIdempotencyKey(r.id, date),
      categoryId: r.categoryId,
      amount: r.amount,
      date,
      description: r.description ?? null,
    }));

    await this.transactionRepository
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values(values)
      .orIgnore()
      .execute();
  }

  private async ensureStateRow(): Promise<RecurringProcessingState> {
    const id = 1;
    let state = await this.stateRepository.findOneBy({ id });
    if (!state) {
      state = this.stateRepository.create({ id, lastProcessedDate: null });
      return this.stateRepository.save(state);
    }
    return state;
  }
}

function parseDateParts(date: string): { year: number; month1to12: number; day: number } {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date: ${date}`);
  }

  return {
    year: Number(match[1]),
    month1to12: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateFromUtcDate(date: Date): string {
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: string, days: number): string {
  const { year, month1to12, day } = parseDateParts(date);
  const base = new Date(Date.UTC(year, month1to12 - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return formatDateFromUtcDate(base);
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}
