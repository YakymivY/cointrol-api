import { Injectable } from '@nestjs/common';
import { Transaction } from './entities/transaction.entity';
import { DataSource, Repository } from 'typeorm';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class TransactionsRepository extends Repository<Transaction> {
  constructor(private dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  async createTransaction(
    addTransactionDto: AddTransactionDto,
    user: User,
  ): Promise<void> {
    const { asset, amount, price } = addTransactionDto;

    const tx = this.create({
      userId: user.id,
      asset,
      amount,
      price,
    });

    await this.save(tx);
  }
}
