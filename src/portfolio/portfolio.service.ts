import { PortfolioRepository } from './repositories/portfolio.repository';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PortfolioAsset,
  PortfolioAssetAmount,
  PortfolioData,
} from './interfaces/portfolio-data.interface';
import { FundsOperationDto } from './dto/funds-operation.dto';
import { BalanceRepository } from './repositories/balance.repository';
import { UsersRepository } from 'src/auth/users.repository';
import { BalanceResponse } from './interfaces/balance-response.interface';
import { Cache } from '@nestjs/cache-manager';
import { WebsocketService } from 'src/shared/websocket/websocket.service';
import { wsMessageType } from 'src/shared/enums/ws-message-type.enum';

@Injectable()
export class PortfolioService {
  private logger = new Logger(PortfolioService.name);
  constructor(
    private readonly wsService: WebsocketService,
    private env: ConfigService,
    @InjectRepository(PortfolioRepository)
    private readonly portfolioRepository: PortfolioRepository,
    @InjectRepository(BalanceRepository)
    private readonly balanceRepository: BalanceRepository,
    @InjectRepository(UsersRepository)
    private readonly usersRepository: UsersRepository,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  // async fetchExchangeRate(asset: string): Promise<ExchangeRateResponse> {
  //   //composing external api url
  //   const url: string = `${this.env.get<string>('COINAPI_URL')}/exchangerate/${asset}/USDT`;
  //   const headers = {
  //     'X-CoinAPI-Key': this.env.get<string>('COINAPI_KEY'),
  //   };
  //   try {
  //     const response = await lastValueFrom(this.http.get(url, { headers }));
  //     return response.data;
  //   } catch (error) {
  //     throw new Error(`Failed to fetch exchange rate: ${error.message}`);
  //   }
  // }

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

    let assetsAmount: PortfolioAssetAmount[] | null =
      await this.cacheManager.get(`portfolio:${userId}`);
    if (!assetsAmount) {
      //get amount from db
      this.logger.debug('Fetching data from db');
      assetsAmount = await this.portfolioRepository.find({
        where: { userId },
        select: ['asset', 'amount', 'averageEntryPrice'],
      });

      //TODO send assets list to add to tracklist ?

      //writing users portfolio data into cache with time-to-live of 1h
      this.cacheManager.set(`portfolio:${userId}`, assetsAmount, 3600000);
    }

    // ?????? pings every time
    //start websocket exchange rate fetching
    this.wsService.addAssetMessage(
      assetsAmount.map((obj) => obj.asset),
      wsMessageType.SUBSCRIBE,
    );

    //adding additional data for each asset
    for (const item of assetsAmount) {
      try {
        const price: number = await this.cacheManager.get(
          `exchangeRates:${item.asset}`,
        );
        const total: number = price * item.amount;
        const totalSpent = item.averageEntryPrice * item.amount;
        const pnl: number = total - totalSpent;
        const pnlPercent: number = (pnl / totalSpent) * 100;
        const assetObj: PortfolioAsset = {
          asset: item.asset,
          amount: item.amount,
          price,
          total,
          average: item.averageEntryPrice,
          totalSpent,
          pnl,
          pnlPercent,
        };
        //add to portfolio assets
        portfolioData.assets.push(assetObj);
      } catch (error) {
        this.logger.error(`Failed to update token data: ${error.message}`);
        throw new Error('Failed to update portfolio data');
      }
    }

    return portfolioData;
  }

  async depositFunds(
    depositDto: FundsOperationDto,
    userId: string,
  ): Promise<void> {
    const { amount } = depositDto;

    //fetch user
    const user = await this.usersRepository.findUser(userId);
    if (!user) {
      throw new NotFoundException('User with provided ID not found.');
    }

    //fetch or initialize balance
    let balance = await this.balanceRepository.findBalanceOfUser(userId);

    if (!balance) {
      //create a new balance record
      balance = this.balanceRepository.create({
        user,
        balance: amount,
        deposit: amount,
        withdraw: 0,
      });
    } else {
      //update existing balance
      balance.balance = balance.balance + amount;
      balance.deposit = balance.deposit + amount;
    }

    //save to the database
    try {
      await this.balanceRepository.saveBalance(balance);
    } catch (error) {
      this.logger.error(`Erorr updating the balance: ${error}`);
      throw new InternalServerErrorException('Failed to update the balance.');
    }
  }

  async withdrawFunds(
    withdrawDto: FundsOperationDto,
    userId: string,
  ): Promise<void> {
    const { amount } = withdrawDto;

    //fetch user
    const user = await this.usersRepository.findUser(userId);
    if (!user) {
      throw new NotFoundException('User with provided ID not found.');
    }

    //fetch or initialize balance
    const balance = await this.balanceRepository.findBalanceOfUser(userId);

    if (!balance || balance.balance < amount) {
      throw new InternalServerErrorException(
        'Failed to withdraw. Not enough balance',
      );
    } else {
      //update balance and withdraw amount
      balance.balance = balance.balance - amount;
      balance.withdraw = balance.withdraw + amount;
    }

    //save to the database
    try {
      await this.balanceRepository.saveBalance(balance);
    } catch (error) {
      this.logger.error(`Erorr updating the balance: ${error}`);
      throw new InternalServerErrorException('Failed to update the balance.');
    }
  }

  async getUserBalance(userId: string): Promise<BalanceResponse | null> {
    try {
      //fetch data from db
      const balance = await this.balanceRepository.findBalanceOfUser(userId);
      //form response object
      return {
        userId: balance.user.id,
        balance: balance.balance,
        deposit: balance.deposit,
        withdraw: balance.withdraw,
      };
    } catch (error) {
      this.logger.error(`Error fetching user's balance: ${error}`);
      throw new InternalServerErrorException('Failed to get users balance');
    }
  }
}
