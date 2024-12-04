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

@Module({
  imports: [
    HttpModule,
    AuthModule,
    TypeOrmModule.forFeature([Portfolio, Balance]),
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    PortfolioRepository,
    BalanceRepository,
    UsersRepository,
    WebsocketService,
  ],
})
export class PortfolioModule {}
