import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { RecurringExpense } from '../recurring-expenses/recurring-expense.entity';
import { Transaction } from '../transactions/transaction.entity';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(RecurringExpense)
    private readonly recurringExpenseRepository: Repository<RecurringExpense>,
  ) {}

  async buildXlsx(): Promise<Buffer> {
    const [categories, transactions, recurring] = await Promise.all([
      this.categoryRepository.find({ order: { name: 'ASC' } }),
      this.transactionRepository.find({ order: { date: 'DESC' } }),
      this.recurringExpenseRepository.find({ order: { dayOfMonth: 'ASC' } }),
    ]);

    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'money-flow-backend';
    workbook.created = new Date();

    this.addTransactionsSheet(workbook, transactions, categoryNameById);
    this.addCategoriesSheet(workbook, categories);
    this.addRecurringSheet(workbook, recurring, categoryNameById);

    const out = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(out) ? out : Buffer.from(out);
  }

  private addTransactionsSheet(
    workbook: ExcelJS.Workbook,
    transactions: Transaction[],
    categoryNameById: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Transactions');
    sheet.columns = [
      { header: 'id', key: 'id', width: 36 },
      { header: 'source', key: 'source', width: 12 },
      { header: 'idempotencyKey', key: 'idempotencyKey', width: 40 },
      { header: 'date', key: 'date', width: 12 },
      { header: 'amount', key: 'amount', width: 12 },
      { header: 'categoryId', key: 'categoryId', width: 36 },
      { header: 'categoryName', key: 'categoryName', width: 20 },
      { header: 'description', key: 'description', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn('amount').numFmt = '0.00';

    sheet.addRows(
      transactions.map((t) => ({
        id: t.id,
        source: t.source,
        idempotencyKey: t.idempotencyKey ?? null,
        date: t.date,
        amount: Number(t.amount),
        categoryId: t.categoryId,
        categoryName: categoryNameById.get(t.categoryId) ?? null,
        description: t.description ?? null,
      })),
    );
  }

  private addCategoriesSheet(workbook: ExcelJS.Workbook, categories: Category[]): void {
    const sheet = workbook.addWorksheet('Categories');
    sheet.columns = [
      { header: 'id', key: 'id', width: 36 },
      { header: 'name', key: 'name', width: 24 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.addRows(categories.map((c) => ({ id: c.id, name: c.name })));
  }

  private addRecurringSheet(
    workbook: ExcelJS.Workbook,
    recurring: RecurringExpense[],
    categoryNameById: Map<string, string>,
  ): void {
    const sheet = workbook.addWorksheet('Recurring');
    sheet.columns = [
      { header: 'id', key: 'id', width: 36 },
      { header: 'categoryId', key: 'categoryId', width: 36 },
      { header: 'categoryName', key: 'categoryName', width: 20 },
      { header: 'amount', key: 'amount', width: 12 },
      { header: 'dayOfMonth', key: 'dayOfMonth', width: 10 },
      { header: 'date', key: 'date', width: 12 },
      { header: 'description', key: 'description', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn('amount').numFmt = '0.00';

    sheet.addRows(
      recurring.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        categoryName: categoryNameById.get(r.categoryId) ?? null,
        amount: Number(r.amount),
        dayOfMonth: r.dayOfMonth,
        date: r.date,
        description: r.description ?? null,
      })),
    );
  }
}
