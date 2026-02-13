import { IsString, Length } from 'class-validator';

export class UpdateTimezoneDto {
  @IsString()
  @Length(1, 32)
  utcOffset!: string;
}
