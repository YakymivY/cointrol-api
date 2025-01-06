import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './integrations/entities/asset.entity';
import { IsAssetValidConstraint } from './validators/is-asset-valid.validator';
import { IsAssetValidService } from './validators/is-asset-valid.service';
import { AssetsRepository } from './integrations/repositories/assets.repository';
import { Coin } from './integrations/entities/coin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Coin])],
  providers: [IsAssetValidConstraint, AssetsRepository, IsAssetValidService],
  exports: [IsAssetValidConstraint, IsAssetValidService],
})
export class SharedModule {}
