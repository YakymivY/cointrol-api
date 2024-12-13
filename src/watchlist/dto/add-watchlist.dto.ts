import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class AddWatchlistDto {
  @IsNotEmpty()
  @IsString()
  asset: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  priceThreshold: number;

  @IsNotEmpty()
  @IsString()
  telegramUsername: string;
}
