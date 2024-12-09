import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Storage } from '../entities/storage.entity';

@Injectable()
export class TransactionsRepository extends Repository<Transaction> {
  private logger = new Logger(TransactionsRepository.name);
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  async createTransaction(
    asset: string,
    amount: number,
    price: number,
    user: User,
    storage?: Storage,
    timestamp?: string,
  ): Promise<void> {
    try {
      const tx = this.create({
        userId: user.id,
        asset,
        amount,
        price,
        storage,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });
      await this.save(tx);
    } catch (error) {
      this.logger.error(
        `Failed to create transaction for user ${user.id} with asset ${asset}. Error: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to create transaction.');
    }
  }
}
