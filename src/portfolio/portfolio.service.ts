import { PortfolioRepository } from './portfolio.repository';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { ExchangeRateResponse } from './interfaces/exchange-rate.interface';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PortfolioAsset,
  PortfolioAssetAmount,
  PortfolioData,
} from './interfaces/portfolio-data.interface';

@Injectable()
export class PortfolioService {
  private logger = new Logger(PortfolioService.name);
  constructor(
    private readonly http: HttpService,
    private env: ConfigService,
    @InjectRepository(PortfolioRepository)
    private readonly portfolioRepository: PortfolioRepository,
  ) {}

  async fetchExchangeRate(asset: string): Promise<ExchangeRateResponse> {
    //composing external api url
    const url: string = `${this.env.get<string>('COINAPI_URL')}/exchangerate/${asset}/USDT?apikey=${this.env.get<string>('COINAPI_KEY')}`;
    try {
      const response = await lastValueFrom(this.http.get(url));
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch exchange rate: ${error.message}`);
    }
  }

  // async addAsset(portfolioAssetDto: PortfolioAssetDto): Promise<void> {
  //   return this.portfolioRepository.addAsset(portfolioAssetDto);
  // }

  //compose an instance of portfolio with all important data
  async getPortfolio(userId: string): Promise<PortfolioData> {
    //initial value
    const portfolioData: PortfolioData = {
      userId,
      assets: [],
    };

    //get amount from db
    const assetsAmount: PortfolioAssetAmount[] =
      await this.portfolioRepository.find({
        where: { userId },
        select: ['asset', 'amount'],
      });

    //adding additional data for each asset
    for (const item of assetsAmount) {
      try {
        const price: number = (await this.fetchExchangeRate(item.asset)).rate;
        const total: number = price * item.amount;
        const assetObj: PortfolioAsset = {
          asset: item.asset,
          amount: item.amount,
          price,
          total,
        };
        //add to portfolio assets
        portfolioData.assets.push(assetObj);
      } catch (error) {
        this.logger.error(
          `Failed to fetch exchange rate from external API: ${error.message}`,
        );
        throw new Error('Failed to fetch exchange rate');
      }
    }

    return portfolioData;
  }
}
