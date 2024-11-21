import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { ExchangeRateResponse } from './interfaces/exchange-rate.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { PortfolioAssetDto } from './dto/portfolio-asset.dto';
import { PortfolioData } from './interfaces/portfolio-data.interface';

@Controller('portfolio')
@UseGuards(AuthGuard())
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}
  //fictive
  @Get('/exchange-rate')
  async getExchangeRate(): Promise<ExchangeRateResponse> {
    const asset: string = 'BTC';
    return this.portfolioService.fetchExchangeRate(asset);
  }

  @Get('/data')
  getPortfolioData(@GetUser() user: User): Promise<PortfolioData> {
    return this.portfolioService.getPortfolio(user.id);
  }

  @Post('/add-asset')
  async addPortfolioAsset(
    @Body() portfolioAssetDto: PortfolioAssetDto,
    @GetUser() user: User,
  ): Promise<void> {
    portfolioAssetDto.userId = user.id;
    return this.portfolioService.addAsset(portfolioAssetDto);
  }
}
