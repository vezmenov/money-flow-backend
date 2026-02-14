import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BackupsModule } from './backups/backups.module';
import { CategoriesModule } from './categories/categories.module';
import { ExportsModule } from './exports/exports.module';
import { OpenClawModule } from './openclaw/openclaw.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { SettingsModule } from './settings/settings.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 1000,
        },
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data/database.sqlite',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    }),
    BackupsModule,
    CategoriesModule,
    ExportsModule,
    OpenClawModule,
    SettingsModule,
    RecurringExpensesModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
