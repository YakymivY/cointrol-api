import { Module } from '@nestjs/common';
import { WsGateway } from './gateway';
import { PortfolioService } from 'src/portfolio/portfolio.service';
import { WebsocketService } from '../websocket/websocket.service';
import { PortfolioRepository } from 'src/portfolio/repositories/portfolio.repository';
import { UsersRepository } from 'src/auth/users.repository';
import { BalanceRepository } from 'src/portfolio/repositories/balance.repository';
import { HttpModule } from '@nestjs/axios';
import { PortfolioModule } from 'src/portfolio/portfolio.module';

@Module({
  imports: [HttpModule, PortfolioModule],
  providers: [
    WsGateway,
    WebsocketService,
    PortfolioService,
    PortfolioRepository,
    UsersRepository,
    BalanceRepository,
  ],
})
export class GatewayModule {}
