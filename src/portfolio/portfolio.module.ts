import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { Balance } from './entities/balance.entity';
import { BalanceRepository } from './repositories/balance.repository';
import { UsersRepository } from 'src/auth/users.repository';
import { WebsocketService } from 'src/shared/websocket/websocket.service';
import { HistoryRepository } from './repositories/history.repository';
import { History } from './entities/history.entity';
import { IsAssetValidConstraint } from 'src/shared/validators/is-asset-valid.validator';
import { AssetsRepository } from 'src/shared/integrations/assets.repository';
import { Asset } from 'src/shared/integrations/entities/asset.entity';
import { SharedModule } from 'src/shared/shared.module';
import { FixedPnlRepository } from './repositories/fixed-pnl.repository';
import { FixedPnl } from './entities/fixed-pnl.entity';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    SharedModule,
    TypeOrmModule.forFeature([Portfolio, Balance, History, Asset, FixedPnl]),
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    PortfolioRepository,
    BalanceRepository,
    UsersRepository,
    WebsocketService,
    HistoryRepository,
    AssetsRepository,
    IsAssetValidConstraint,
    FixedPnlRepository,
  ],
  exports: [HttpModule],
})
export class PortfolioModule {}
