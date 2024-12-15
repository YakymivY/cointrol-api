import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ThresholdDirection } from 'src/shared/enums/threshold-direction.enum';
import { WatchlistStatus } from 'src/shared/enums/watchlist-status.enum';

export class AddWatchlistDto {
  @IsNotEmpty()
  @IsString()
  asset: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  priceThreshold: number;

  @IsEnum(ThresholdDirection, {
    message: 'Threshold direction must be "above" or "below".',
  })
  thresholdDirection: string;

  @IsOptional()
  @IsEnum(WatchlistStatus, {
    message: 'Watchlist item status must be "active" or "disabled".',
  })
  status?: string;

  @IsNotEmpty()
  @IsString()
  telegramUsername: string;
}
