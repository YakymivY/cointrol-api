import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Transaction } from './entities/transaction.entity';
import { DataSource, Repository } from 'typeorm';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class TransactionsRepository extends Repository<Transaction> {
  private logger = new Logger(TransactionsRepository.name);
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  async createTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<void> {
    const { asset, amount, price, timestamp } = addTransactionDto;

    try {
      const tx = this.create({
        userId: user.id,
        asset,
        amount,
        price,
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
