import { Controller, Get } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}
  //fictive
  @Get('/exchange-rate')
  async getExchangeRate() {
    const asset: string = 'BTC';
    return this.portfolioService.fetchExchangeRate(asset);
  }
}
