import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FixedPnl } from '../entities/fixed-pnl.entity';
import { FixedPnl as FixedPnlInterface } from '../interfaces/fixed-pnl.interface';

@Injectable()
export class FixedPnlRepository extends Repository<FixedPnl> {
  constructor(private dataSource: DataSource) {
    super(FixedPnl, dataSource.createEntityManager());
  }

  async getLatestFixedPnlRecord(
    userId: string,
  ): Promise<FixedPnlInterface | null> {
    return await this.findOne({
      where: { userId },
      order: { timestamp: 'DESC' },
      cache: true,
    });
  }
}
