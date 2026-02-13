import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class OpenClawUpsertTransactionDto {
  @IsString()
  @Length(1, 255)
  idempotencyKey!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @Length(1, 100)
  categoryName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string | null;
}

