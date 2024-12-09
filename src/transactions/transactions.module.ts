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

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Storage]),
    AuthModule,
    PortfolioModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsRepository,
    PortfolioRepository,
    BalanceRepository,
    StorageRepository,
  ],
})
export class TransactionsModule {}
