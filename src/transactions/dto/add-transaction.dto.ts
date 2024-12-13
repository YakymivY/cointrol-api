import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { isAssetValid } from 'src/shared/validators/is-asset-valid.validator';

export class AddTransactionDto {
  @IsNotEmpty()
  @IsString()
  @isAssetValid({ message: 'The specified asset is not valid.' })
  asset: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
