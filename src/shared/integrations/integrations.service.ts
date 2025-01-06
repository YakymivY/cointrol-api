import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { Asset } from './entities/asset.entity';
import { Like } from 'typeorm';
import { AssetsRepository } from './repositories/assets.repository';
import { CoinlistItem } from './interfaces/coinlist-item.interface';
import { CoinsRepository } from './repositories/coins.repository';
import { Coin } from './entities/coin.entity';
import { CoinMetrics } from './interfaces/coin-metrics.interface';

@Injectable()
export class IntegrationsService {
  private readonly apiUrl = 'https://rest.coinapi.io/v1/assets';
  private logger = new Logger(IntegrationsService.name);

  constructor(
    private env: ConfigService,
    private readonly http: HttpService,
    @InjectRepository(AssetsRepository)
    private assetsRepository: AssetsRepository,
    @InjectRepository(CoinsRepository)
    private coinsRepository: CoinsRepository,
  ) {}

  async syncAssets(): Promise<void> {
    try {
      //fetch data from external API
      const headers = {
        'X-CoinAPI-Key': this.env.get<string>('COINAPI_KEY'),
      };
      const response = await firstValueFrom(
        this.http.get(this.apiUrl, { headers }),
      );
      const assets = response.data;

      //filer and map the data
      const cryptoAssets = assets
        .filter((asset: any) => asset.type_is_crypto == 1)
        .map((asset: any) => ({
          ticker: asset.asset_id,
          name: asset.name,
        }));

      //insert or update assets
      for (const cryptoAsset of cryptoAssets) {
        await this.assetsRepository
          .createQueryBuilder()
          .insert()
          .into(Asset)
          .values(cryptoAsset)
          .onConflict(`("ticker") DO UPDATE SET name = :name`)
          .setParameter('name', cryptoAsset.name)
          .execute();
      }

      this.logger.log('Assets synchronized successfully.');
    } catch (error) {
      this.logger.error('Failed to synchronize assets: ', error.message);
      throw error;
    }
  }

  async findAsset(query: string): Promise<string[]> {
    query = query.toUpperCase();
    const assets: Asset[] = await this.assetsRepository.find({
      where: { ticker: Like(`%${query}%`) },
    });
    const assetsList: string[] = assets.map((item) => item.ticker);
    return assetsList;
  }

  async isAsset(query: string): Promise<boolean> {
    query = query.toUpperCase();
    const asset: Asset = await this.assetsRepository.findOne({
      where: { ticker: query },
    });

    return asset ? true : false;
  }

  //CoinGecko data

  async fetchCoinList(): Promise<CoinlistItem[]> {
    const url: string = this.env.get<string>('COINGECKO_BASE_URL');
    const key: string = this.env.get<string>('COINGECKO_API_KEY');

    const headers = {
      'x-cg-demo-api-key': key,
    };
    const response = await lastValueFrom(
      this.http.get<CoinlistItem[]>(`${url}/coins/list`, { headers }),
    );
    return response.data;
  }

  async updateCoinList(): Promise<void> {
    const coinList: CoinlistItem[] = await this.fetchCoinList();

    const coinsToSave = coinList.map((coin) => ({
      coingeckoId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
    }));

    await this.coinsRepository.saveCoins(coinsToSave);
  }

  async getCoinIdsByTicker(ticker: string): Promise<string[]> {
    //get all coins with appropriate ticker
    const coins: Coin[] = await this.coinsRepository.find({
      where: { symbol: ticker },
    });
    //extract ids
    const ids: string[] = coins.map((coin) => coin.coingeckoId);
    return ids;
  }

  async getMetadataForCoins(ticker: string): Promise<CoinMetrics> {
    const ids: string[] = await this.getCoinIdsByTicker(ticker.toLowerCase());

    const url: string = this.env.get<string>('COINGECKO_BASE_URL');
    const key: string = this.env.get<string>('COINGECKO_API_KEY');

    //add authentication header
    const headers = {
      'x-cg-demo-api-key': key,
    };
    //compose params
    const params = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      ids: ids.join(','),
    };
    try {
      //fetch from api
      const response = await lastValueFrom(
        this.http.get<CoinMetrics[]>(`${url}/coins/markets`, {
          headers,
          params,
        }),
      );
      return response.data[0];
    } catch (error) {
      this.logger.error(
        'Error fetching data from coingecko metadata api:',
        error.message,
      );
      throw error;
    }
  }
}
