import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Coin } from '../entities/coin.entity';

@Injectable()
export class CoinsRepository extends Repository<Coin> {
  constructor(private dataSource: DataSource) {
    super(Coin, dataSource.createEntityManager());
  }

  async saveCoins(coins): Promise<void> {
    await this.upsert(coins, ['coingeckoId']);
  }

  async findAll(): Promise<Coin[]> {
    return this.find();
  }
}
