import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './integrations/entities/asset.entity';
import { IsAssetValidConstraint } from './validators/is-asset-valid.validator';
import { AssetsRepository } from './integrations/assets.repository';
import { IsAssetValidService } from './validators/is-asset-valid.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [IsAssetValidConstraint, AssetsRepository, IsAssetValidService],
  exports: [IsAssetValidConstraint, IsAssetValidService],
})
export class SharedModule {}
