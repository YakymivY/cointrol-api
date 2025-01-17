import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { PortfolioData } from './interfaces/portfolio-data.interface';
import { FundsOperationDto } from './dto/funds-operation.dto';
import { BalanceResponse } from './interfaces/balance-response.interface';
import { WebsocketService } from 'src/shared/websocket/websocket.service';
import { OwnedAsset } from './interfaces/owned-assets.interface';
import { FixedPnl } from './interfaces/fixed-pnl.interface';
import { DepositResponse } from './interfaces/deposit-response.interface';
import { WithdrawResponse } from './interfaces/withgraw-response.interface';

@Controller('portfolio')
@UseGuards(AuthGuard())
export class PortfolioController {
  private logger = new Logger(PortfolioController.name);
  constructor(
    private portfolioService: PortfolioService,
    private websocketService: WebsocketService,
  ) {}

  @Get('/exchange-rate/:asset')
  //fetch exchange rates from external API
  async getExchangeRate(@Param('asset') asset: string): Promise<number> {
    return this.portfolioService.fetchExchangeRate(asset);
  }

  @Get('/data')
  //send full portfolio object with necessary data
  getPortfolioData(@GetUser() user: User): Promise<PortfolioData> {
    this.logger.verbose(`Getting portfolio data for user ${user.id}.`);
    return this.portfolioService.getPortfolio(user.id);
  }

  @Get('/assets')
  getUserAssets(@GetUser() user: User): Promise<OwnedAsset[]> {
    return this.portfolioService.getUserAssets(user.id);
  }

  @Post('/deposit')
  //deposit funds to crypto
  depositFunds(
    @GetUser() user: User,
    @Body() depositDto: FundsOperationDto,
  ): Promise<DepositResponse> {
    return this.portfolioService.depositFunds(depositDto, user.id);
  }

  @Post('/withdraw')
  //withdraw funds from crypto
  withdrawFunds(
    @GetUser() user: User,
    @Body() withdrawDto: FundsOperationDto,
  ): Promise<WithdrawResponse> {
    return this.portfolioService.withdrawFunds(withdrawDto, user.id);
  }

  @Get('/balance')
  //get balance of user
  getUserBalance(@GetUser() user: User): Promise<BalanceResponse | null> {
    return this.portfolioService.getUserBalance(user.id);
  }

  @Get('/fixed-pnl')
  //get history of user's fixed pnls
  getUserFixedPnls(@GetUser() user: User): Promise<FixedPnl[]> {
    return this.portfolioService.getUserFixedPnlsHistory(user.id);
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

  @Get('/websocket')
  wsMessage(@Body() message: any) {
    this.websocketService.sendMessage(message);
  }
}
