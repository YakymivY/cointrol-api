import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsRepository } from './transactions.repository';
import { Transaction } from './entities/transaction.entity';
import { PortfolioModule } from 'src/portfolio/portfolio.module';
import { PortfolioRepository } from 'src/portfolio/portfolio.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AuthModule,
    PortfolioModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository, PortfolioRepository],
})
export class TransactionsModule {}
