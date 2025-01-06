import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsRepository } from './repositories/transactions.repository';
import { Transaction } from './entities/transaction.entity';
import { PortfolioModule } from 'src/portfolio/portfolio.module';
import { PortfolioRepository } from 'src/portfolio/repositories/portfolio.repository';
import { BalanceRepository } from 'src/portfolio/repositories/balance.repository';
import { StorageRepository } from './repositories/storage.repository';
import { Storage } from './entities/storage.entity';
import { HistoryRepository } from 'src/portfolio/repositories/history.repository';
import { IsAssetValidConstraint } from 'src/shared/validators/is-asset-valid.validator';
import { Asset } from 'src/shared/integrations/entities/asset.entity';
import { SharedModule } from 'src/shared/shared.module';
import { FixedPnlRepository } from 'src/portfolio/repositories/fixed-pnl.repository';
import { AssetsRepository } from 'src/shared/integrations/repositories/assets.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Storage, Asset]),
    AuthModule,
    PortfolioModule,
    SharedModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsRepository,
    PortfolioRepository,
    BalanceRepository,
    StorageRepository,
    HistoryRepository,
    AssetsRepository,
    IsAssetValidConstraint,
    FixedPnlRepository,
  ],
})
export class TransactionsModule {}
