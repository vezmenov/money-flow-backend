import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsUUID()
  categoryId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
