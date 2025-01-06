import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { IntegrationsController } from './integrations.controller';
import { HttpModule } from '@nestjs/axios';
import { AssetsRepository } from './repositories/assets.repository';
import { Coin } from './entities/coin.entity';
import { CoinsRepository } from './repositories/coins.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Coin]), HttpModule],
  providers: [IntegrationsService, AssetsRepository, CoinsRepository],
  controllers: [IntegrationsController],
  exports: [AssetsRepository],
})
export class IntegrationsModule {}
