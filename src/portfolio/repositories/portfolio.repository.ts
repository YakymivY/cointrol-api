import { Injectable } from '@nestjs/common';
import { Portfolio } from '../entities/portfolio.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PortfolioRepository extends Repository<Portfolio> {
  constructor(private dataSource: DataSource) {
    super(Portfolio, dataSource.createEntityManager());
  }

  // async addAsset(portfolioAssetDto: PortfolioAssetDto): Promise<void> {
  //   const { userId, asset, amount } = portfolioAssetDto;

  //   const portfolioAsset = this.create({
  //     userId,
  //     asset,
  //     amount,
  //   });

  //   try {
  //     await this.save(portfolioAsset);
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       `Failed to add asset to the portfolio: ${error}`,
  //     );
  //   }
  // }
}
