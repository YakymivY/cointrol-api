import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Balance } from '../entities/balance.entity';

@Injectable()
export class BalanceRepository extends Repository<Balance> {
  private logger = new Logger(BalanceRepository.name);
  constructor(private dataSource: DataSource) {
    super(Balance, dataSource.createEntityManager());
  }

  async findBalanceOfUser(userId: string): Promise<Balance | null> {
    return await this.findOne({ where: { user: { id: userId } } });
  }

  async saveBalance(balance: Balance): Promise<Balance> {
    return await this.save(balance);
  }
}
