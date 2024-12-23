import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { AssetsRepository } from './assets.repository';
import { Asset } from './entities/asset.entity';
import { Like } from 'typeorm';

@Injectable()
export class IntegrationsService {
  private readonly apiUrl = 'https://rest.coinapi.io/v1/assets';
  private logger = new Logger(IntegrationsService.name);

  constructor(
    private env: ConfigService,
    private readonly http: HttpService,
    @InjectRepository(AssetsRepository)
    private assetsRepository: AssetsRepository,
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
}
