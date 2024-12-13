import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetsRepository } from './assets.repository';
import { IntegrationsController } from './integrations.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Asset]), HttpModule],
  providers: [IntegrationsService, AssetsRepository],
  controllers: [IntegrationsController],
  exports: [AssetsRepository],
})
export class IntegrationsModule {}
