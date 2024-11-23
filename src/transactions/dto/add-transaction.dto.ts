import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class AddTransactionDto {
  @IsNotEmpty()
  @IsString()
  asset: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;
}
