import { PortfolioRepository } from './portfolio.repository';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { ExchangeRateResponse } from './interfaces/exchange-rate.interface';
import { PortfolioAssetDto } from './dto/portfolio-asset.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PortfolioAsset,
  PortfolioAssetAmount,
  PortfolioData,
} from './interfaces/portfolio-data.interface';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly http: HttpService,
    private env: ConfigService,
    @InjectRepository(PortfolioRepository)
    private readonly portfolioRepository: PortfolioRepository,
  ) {}

  async fetchExchangeRate(asset: string): Promise<ExchangeRateResponse> {
    const url: string = `${this.env.get<string>('COINAPI_URL')}/exchangerate/${asset}/USDT?apikey=${this.env.get<string>('COINAPI_KEY')}`;
    try {
      const response = await lastValueFrom(this.http.get(url));
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch exchange rate: ${error.message}`);
    }
  }

  async addAsset(portfolioAssetDto: PortfolioAssetDto): Promise<void> {
    return this.portfolioRepository.addAsset(portfolioAssetDto);
  }

  async getPortfolio(userId: string): Promise<PortfolioData> {
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
        portfolioData.assets.push(assetObj);
      } catch (error) {
        throw new Error(`Failed to fetch exchange rate: ${error.message}`);
      }
    }

    return portfolioData;
  }
}
