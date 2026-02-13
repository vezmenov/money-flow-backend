import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { OpenClawUpsertTransactionDto } from './openclaw-upsert-transaction.dto';

export class OpenClawImportTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OpenClawUpsertTransactionDto)
  transactions!: OpenClawUpsertTransactionDto[];
}

