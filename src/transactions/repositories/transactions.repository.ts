import { Injectable, Logger } from '@nestjs/common';
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

  createTransactionEntity(
    asset: string,
    amount: number,
    price: number,
    user: User,
    storage?: Storage,
    timestamp?: string,
  ): Transaction {
    const tx = this.create({
      userId: user.id,
      asset,
      amount,
      price,
      storage,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });
    return tx;
  }
}
