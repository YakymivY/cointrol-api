import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PortfolioAssetDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsString()
  asset: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
