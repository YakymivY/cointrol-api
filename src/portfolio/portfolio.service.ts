import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { ExchangeRateResponse } from './interfaces/exchange-rate.interface';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly http: HttpService,
    private env: ConfigService,
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
}
