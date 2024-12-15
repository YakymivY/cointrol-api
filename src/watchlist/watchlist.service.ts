import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AddWatchlistDto } from './dto/add-watchlist.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchlistRepository } from './repositories/watchlist.repository';
import { WatchlistInterface } from './interfaces/watchlist.interface';

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
    const {
      asset,
      priceThreshold,
      thresholdDirection,
      status,
      telegramUsername,
    } = addWatchlistDto;
    try {
      const existingWatchlist = await this.watchlistRepository.findOne({
        where: {
          user_id: userId,
          asset,
          price_threshold: priceThreshold,
          threshold_direction: thresholdDirection,
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
        threshold_direction: thresholdDirection,
        status,
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

  async getWatchlist(userId: string): Promise<WatchlistInterface[]> {
    //initialize array
    const watchlistResponse: WatchlistInterface[] = [];
    try {
      //fetch from database
      const watchlist = await this.watchlistRepository.find({
        where: { user_id: userId },
      });

      //prepare response objects
      for (const item of watchlist) {
        const responseItem: WatchlistInterface = {
          id: item.id,
          user_id: item.user_id,
          asset: item.asset,
          price_threshold: item.price_threshold,
          threshold_direction: item.threshold_direction,
          status: item.status,
        };

        watchlistResponse.push(responseItem);
      }
    } catch (error) {
      this.logger.error(
        `Error getting watchlist for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to get user watchlist');
    }

    return watchlistResponse;
  }

  async updateStatus(userId: string, watchlistId: number): Promise<string> {
    try {
      //find the item to update in database
      const itemToUpdate = await this.watchlistRepository.findOne({
        where: { id: watchlistId, user_id: userId },
      });

      if (!itemToUpdate) {
        throw new NotFoundException('Watchlist item not found');
      }

      itemToUpdate.status =
        itemToUpdate.status === 'active' ? 'disabled' : 'active';
      await this.watchlistRepository.save(itemToUpdate);

      return itemToUpdate.status;
    } catch (error) {
      this.logger.error(
        `Error updating watchlist item ${watchlistId} status: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to update watchlist item status',
      );
    }
  }
}
