import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  categoryId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
