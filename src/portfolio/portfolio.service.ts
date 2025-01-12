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
import { ChangePeriod } from 'src/shared/enums/change-period.enum';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { HistoricalData } from './interfaces/historical-data.interface';
import { OwnedAsset } from './interfaces/owned-assets.interface';
import { FixedPnlRepository } from './repositories/fixed-pnl.repository';
import { FixedPnl } from './interfaces/fixed-pnl.interface';

@Injectable()
export class PortfolioService {
  private logger = new Logger(PortfolioService.name);
  constructor(
    private readonly wsService: WebsocketService,
    private env: ConfigService,
    private http: HttpService,
    @InjectRepository(PortfolioRepository)
    private readonly portfolioRepository: PortfolioRepository,
    @InjectRepository(BalanceRepository)
    private readonly balanceRepository: BalanceRepository,
    @InjectRepository(UsersRepository)
    private readonly usersRepository: UsersRepository,
    @InjectRepository(FixedPnlRepository)
    private readonly fixedPnlRepository: FixedPnlRepository,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  async fetchExchangeRate(asset: string): Promise<number> {
    //composing external api url
    const url: string = `${this.env.get<string>('COINMARKETCAP_BASE_URL')}/cryptocurrency/quotes/latest`;
    const headers = {
      'X-CMC_PRO_API_KEY': this.env.get<string>('COINMARKETCAP_API_KEY'),
    };
    const params = {
      symbol: asset.toUpperCase(),
      convert: 'USD',
    };
    try {
      const response = await lastValueFrom(
        this.http.get(url, { headers, params }),
      );
      return response.data.data[asset].quote.USD.price;
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
      portfolioValue: 0,
      currentPnl: { value: 0, change: 0 },
      fixedPnl: 0,
      totalPnl: 0,
      invested: 0,
      bestPerformer: null,
      worstPerformer: null,
      assets: [],
    };

    let bestPnl: number;
    let worstPnl: number;

    //get asset amount either from db or from cache
    const assetsAmount: PortfolioAssetAmount[] =
      await this.getAssetStaticData(userId);

    //adding additional data for each asset
    for (const [index, item] of assetsAmount.entries()) {
      try {
        //wait for price to be fetched
        const price: number = await this.fetchExrate(item);

        //start composing object
        const total: number = price * item.amount;
        const totalSpent = item.averageEntryPrice * item.amount;
        const pnl: number = total - totalSpent;
        const pnlPercent: number = (pnl / totalSpent) * 100;
        const totalPnl: number = pnl + item.allTimePnl;
        const historicalData: HistoricalData = await this.getHistoricalData(
          item.asset,
          price,
        );

        //portfolio stats incrementation
        portfolioData.portfolioValue += total;
        portfolioData.currentPnl.value += pnl;
        portfolioData.fixedPnl += item.allTimePnl;
        portfolioData.totalPnl += totalPnl;
        portfolioData.invested += totalSpent;

        //update best & worst performers
        if (!bestPnl || !worstPnl) {
          bestPnl = pnl;
          worstPnl = pnl;
          portfolioData.bestPerformer = index;
          portfolioData.worstPerformer = index;
        }
        if (pnl > bestPnl) {
          bestPnl = pnl;
          portfolioData.bestPerformer = index;
        } else if (pnl < worstPnl) {
          worstPnl = pnl;
          portfolioData.worstPerformer = index;
        }

        const assetObj: PortfolioAsset = {
          asset: item.asset,
          amount: item.amount,
          price,
          total,
          average: item.averageEntryPrice,
          totalSpent,
          pnl,
          pnlPercent,
          allTimePnl: item.allTimePnl,
          totalPnl,
          historicalData,
        };
        //add to portfolio assets
        portfolioData.assets.push(assetObj);
      } catch (error) {
        this.logger.error(`Failed to update token data: ${error.message}`);
        throw new Error('Failed to update portfolio data');
      }
    }

    //calculate change
    portfolioData.currentPnl.change =
      (portfolioData.currentPnl.value / portfolioData.invested) * 100;

    return portfolioData;
  }

  async getAssetStaticData(userId: string): Promise<PortfolioAssetAmount[]> {
    let assetsAmount: PortfolioAssetAmount[] | null =
      await this.cacheManager.get(`portfolio:${userId}`);
    //no asset data stored in cache
    if (!assetsAmount) {
      //get amount from db
      assetsAmount = await this.portfolioRepository
        .createQueryBuilder('portfolio')
        .leftJoinAndSelect('portfolio.history', 'history')
        .where('portfolio.userId = :userId', { userId })
        .select([
          'portfolio.asset',
          'portfolio.amount',
          'portfolio.averageEntryPrice',
          'history.allTimePnl',
        ])
        .getMany()
        .then((portfolios) =>
          portfolios.map((portfolio) => ({
            asset: portfolio.asset,
            amount: portfolio.amount,
            averageEntryPrice: portfolio.averageEntryPrice,
            allTimePnl: portfolio.history ? portfolio.history.allTimePnl : 0,
          })),
        );

      //writing users portfolio data into cache with time-to-leave of 1h
      this.cacheManager.set(`portfolio:${userId}`, assetsAmount, 3600000);

      //add tokens to tracklist
      const userAssets: string[] = assetsAmount.map((obj) => obj.asset);
      this.wsService.addToTracklist(userAssets);
    }
    return assetsAmount;
  }

  async fetchExrate(item: PortfolioAssetAmount): Promise<number> {
    let retries = 0;
    const maxRetries = 50; // Limit retries
    const retryDelay = 100; // 100 ms delay between retries
    let price: number | null;
    do {
      price = await this.cacheManager.get(`exchangeRates:${item.asset}`);
      if (price == null) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Add delay between attempts
      }
    } while (price == null && retries < maxRetries);

    if (price == null) {
      throw new Error(
        `Failed to fetch exchange rate for ${item.asset} after ${maxRetries} attempts.`,
      );
    }

    return price;
  }

  async getHistoricalData(
    asset: string,
    currentPrice: number,
  ): Promise<HistoricalData> {
    const cacheKey: string = `historicalPrices:${asset}`;

    //check if the data is in cache
    let historicalDataChange: HistoricalData =
      await this.cacheManager.get<HistoricalData>(cacheKey);
    //const historicalDataChange: HistoricalData = {};

    if (!historicalDataChange) {
      historicalDataChange = {};
      try {
        this.logger.debug(`Get hist data for ${asset}`);
        //fetch prices from external API
        const [price1h, price1d, price7d] = await Promise.all([
          this.fetchHistoricalPrice(asset, ChangePeriod.ONE_HOUR),
          this.fetchHistoricalPrice(asset, ChangePeriod.ONE_DAY),
          this.fetchHistoricalPrice(asset, ChangePeriod.SEVEN_DAYS),
        ]);

        //create object and store in cache
        const historicalData = { '1h': price1h, '1d': price1d, '7d': price7d };

        //calculate percentage change
        for (const [key, historicalPrice] of Object.entries(historicalData)) {
          const change =
            ((currentPrice - historicalPrice) / historicalPrice) * 100;
          historicalDataChange[key] = {
            price: historicalPrice,
            change: parseFloat(change.toFixed(2)),
          };
        }
        //set historical data in cache for 5min
        await this.cacheManager.set(cacheKey, historicalDataChange, 300000);
      } catch (error) {
        this.logger.error(
          `Failed to fetch historical prices for ${asset}: ${error.message}`,
        );
        throw new Error('Historical data fetch failed');
      }
    }
    return historicalDataChange;
  }

  async fetchHistoricalPrice(
    asset: string,
    period: ChangePeriod,
  ): Promise<number> {
    const now = new Date();
    now.setTime(now.getTime() - period);
    const fetchDate: string = now.toISOString();

    this.logger.debug(
      `Fetching historical data for ${asset} in period ${period}`,
    );

    //create url, params and headers
    const url: string = `${this.env.get<string>('COINAPI_URL')}/exchangerate/${asset}/USDT/history`;
    const headers = {
      'X-CoinAPI-Key': this.env.get<string>('COINAPI_KEY'),
    };
    const params = {
      period_id: '5SEC',
      time_start: fetchDate,
      limit: 1,
    };
    try {
      //fetch data from external source
      const response = await lastValueFrom(
        this.http.get(url, { headers, params }),
      );

      //check if data exists and is not empty
      if (!response || !response.data || response.data.length === 0) {
        this.logger.warn(
          `Historical data for ${asset} in period ${period} ommited`,
        );
        return null;
      }

      //extract price from whole object
      const { rate_open } = response.data[0];
      return rate_open;
    } catch (error) {
      throw new Error(`Failed to fetch exchange rate: ${error.message}`);
    }
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

  async getUserAssets(userId: string): Promise<OwnedAsset[]> {
    try {
      const userAssets = await this.portfolioRepository.find({
        where: { userId },
      });

      return userAssets.map((item) => ({
        asset: item.asset,
        amount: item.amount,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get assets owned by the user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to get user assets');
    }
  }

  async getUserFixedPnlsHistory(userId: string): Promise<FixedPnl[]> {
    const fixedPlnRecords: FixedPnl[] = await this.fixedPnlRepository.find({
      where: { userId },
    });
    return fixedPlnRecords;
  }
}
