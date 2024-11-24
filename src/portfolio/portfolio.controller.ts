import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { ExchangeRateResponse } from './interfaces/exchange-rate.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { PortfolioData } from './interfaces/portfolio-data.interface';

@Controller('portfolio')
@UseGuards(AuthGuard())
export class PortfolioController {
  private logger = new Logger(PortfolioController.name);
  constructor(private portfolioService: PortfolioService) {}

  @Get('/exchange-rate/:asset')
  //fetch exchange rates from external API
  async getExchangeRate(
    @Param('asset') asset: string,
  ): Promise<ExchangeRateResponse> {
    return this.portfolioService.fetchExchangeRate(asset);
  }

  @Get('/data')
  //send full portfolio object with necessary data
  getPortfolioData(@GetUser() user: User): Promise<PortfolioData> {
    this.logger.verbose(`Getting portfolio data for user ${user.id}.`);
    return this.portfolioService.getPortfolio(user.id);
  }

  //optional
  // @Post('/add-asset')
  // async addPortfolioAsset(
  //   @Body() portfolioAssetDto: PortfolioAssetDto,
  //   @GetUser() user: User,
  // ): Promise<void> {
  //   portfolioAssetDto.userId = user.id;
  //   return this.portfolioService.addAsset(portfolioAssetDto);
  // }
}
