import { IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class FundsOperationDto {
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
