import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AssetsRepository } from '../integrations/assets.repository';

@Injectable()
export class IsAssetValidService {
  private logger = new Logger(IsAssetValidService.name);
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetsRepository: AssetsRepository,
  ) {}

  async findAssetName(asset: string): Promise<boolean> {
    try {
      const assetExists = await this.assetsRepository.findOne({
        where: { ticker: asset },
      });
      return !!assetExists;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
