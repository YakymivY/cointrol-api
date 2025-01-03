import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { History } from '../entities/history.entity';

@Injectable()
export class HistoryRepository extends Repository<History> {
  constructor(private dataSource: DataSource) {
    super(History, dataSource.createEntityManager());
  }

  async calculateOverallFixedPnl(userId: string): Promise<number> {
    let overallPnl: number = 0;

    try {
      //find all assets records
      const userPnls: History[] = await this.find({
        where: { userId },
      });

      //add all pnls
      userPnls.forEach((item) => {
        overallPnl += item.allTimePnl;
      });

      return overallPnl;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to calculate overall fixed PnL',
        error,
      );
    }
  }
}
