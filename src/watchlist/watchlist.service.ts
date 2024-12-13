import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AddWatchlistDto } from './dto/add-watchlist.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchlistRepository } from './repositories/watchlist.repository';

@Injectable()
export class WatchlistService {
  private logger = new Logger(WatchlistService.name);

  constructor(
    @InjectRepository(WatchlistRepository)
    private watchlistRepository: WatchlistRepository,
  ) {}

  async addNewWatchlist(
    addWatchlistDto: AddWatchlistDto,
    userId: string,
  ): Promise<void> {
    const { asset, priceThreshold, telegramUsername } = addWatchlistDto;
    try {
      const existingWatchlist = await this.watchlistRepository.findOne({
        where: {
          user_id: userId,
          asset,
          price_threshold: priceThreshold,
          telegram_username: telegramUsername,
        },
      });
      if (existingWatchlist) {
        this.logger.warn('This watchlist item already exists');
        return;
      }
      await this.watchlistRepository.save({
        user_id: userId,
        asset,
        price_threshold: priceThreshold,
        telegram_username: telegramUsername,
      });
      this.logger.log('Item successfully added to watchlist');
    } catch (error) {
      this.logger.error(
        `Failed to add ${asset} to watchlist for user ${userId}. Error: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'An error occured while adding item to watchlist.',
      );
    }
  }
}
