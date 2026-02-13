import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import request = require('supertest');
import { DataSource } from 'typeorm';
import { Category } from '../src/categories/category.entity';
import { ExportsModule } from '../src/exports/exports.module';
import { RecurringExpense } from '../src/recurring-expenses/recurring-expense.entity';
import { Transaction } from '../src/transactions/transaction.entity';

function binaryParser(res: any, callback: (err: Error | null, data: Buffer) => void): void {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
}

describe('Export XLSX', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [Category, Transaction, RecurringExpense],
        }),
        ExportsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  it('returns a .xlsx file with Transactions/Categories/Recurring sheets', async () => {
    const categoryRepo = dataSource.getRepository(Category);
    const txRepo = dataSource.getRepository(Transaction);
    const recurringRepo = dataSource.getRepository(RecurringExpense);

    const food = await categoryRepo.save({ name: 'Food' });
    const rent = await categoryRepo.save({ name: 'Rent' });

    const txNewer = await txRepo.save(
      txRepo.create({
        source: 'manual',
        idempotencyKey: null,
        categoryId: food.id,
        amount: 10.5,
        date: '2026-02-13',
        description: 'Lunch',
      }),
    );

    const txOlder = await txRepo.save(
      txRepo.create({
        source: 'openclaw',
        idempotencyKey: 'openclaw:test:1',
        categoryId: rent.id,
        amount: 1000,
        date: '2026-02-12',
        description: 'Rent',
      }),
    );

    const recurring = await recurringRepo.save(
      recurringRepo.create({
        categoryId: rent.id,
        amount: 1000,
        dayOfMonth: 13,
        date: '2026-02-13',
        description: 'Rent monthly',
      }),
    );

    const resp = await request(app.getHttpServer())
      .get('/api/export/xlsx')
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
      .expect(
        'Content-Type',
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
      )
      .expect('Content-Disposition', /attachment; filename="money-flow-export\.xlsx"/);

    const buffer = resp.body as Buffer;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.slice(0, 2).toString('utf8')).toBe('PK');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      'Transactions',
      'Categories',
      'Recurring',
    ]);

    const txSheet = workbook.getWorksheet('Transactions');
    expect(txSheet).toBeDefined();
    if (!txSheet) {
      throw new Error('Transactions sheet missing');
    }
    expect(txSheet.getRow(1).values).toEqual([
      undefined,
      'id',
      'source',
      'idempotencyKey',
      'date',
      'amount',
      'categoryId',
      'categoryName',
      'description',
    ]);

    // Ordered by date DESC: newer first.
    expect(String(txSheet.getRow(2).getCell(1).value)).toBe(txNewer.id);
    expect(String(txSheet.getRow(3).getCell(1).value)).toBe(txOlder.id);

    expect(String(txSheet.getRow(2).getCell(7).value)).toBe('Food');
    expect(txSheet.getRow(2).getCell(3).value).toBeNull();

    const categoriesSheet = workbook.getWorksheet('Categories');
    expect(categoriesSheet).toBeDefined();
    if (!categoriesSheet) {
      throw new Error('Categories sheet missing');
    }
    expect(categoriesSheet.getRow(1).values).toEqual([undefined, 'id', 'name']);
    expect(categoriesSheet.getRow(2).getCell(2).value).toBe('Food');
    expect(categoriesSheet.getRow(3).getCell(2).value).toBe('Rent');

    const recurringSheet = workbook.getWorksheet('Recurring');
    expect(recurringSheet).toBeDefined();
    if (!recurringSheet) {
      throw new Error('Recurring sheet missing');
    }
    expect(recurringSheet.getRow(1).values).toEqual([
      undefined,
      'id',
      'categoryId',
      'categoryName',
      'amount',
      'dayOfMonth',
      'date',
      'description',
    ]);

    expect(String(recurringSheet.getRow(2).getCell(1).value)).toBe(recurring.id);
    expect(String(recurringSheet.getRow(2).getCell(3).value)).toBe('Rent');
  });
});
