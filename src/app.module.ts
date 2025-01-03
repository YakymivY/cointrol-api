import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './auth/entities/user.entity';
import { JwtStrategy } from './auth/jwt.strategy';
import { UsersRepository } from './auth/users.repository';
import { TransactionsModule } from './transactions/transactions.module';
import { Portfolio } from './portfolio/entities/portfolio.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { WebsocketModule } from './shared/websocket/websocket.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { GatewayModule } from './shared/gateway/gateway.module';
import { Storage } from './transactions/entities/storage.entity';
import { Balance } from './portfolio/entities/balance.entity';
import { History } from './portfolio/entities/history.entity';
import { IntegrationsModule } from './shared/integrations/integrations.module';
import { SharedModule } from './shared/shared.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { IsAssetValidConstraint } from './shared/validators/is-asset-valid.validator';
import { AssetsRepository } from './shared/integrations/assets.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { FixedPnl } from './portfolio/entities/fixed-pnl.entity';

@Module({
  imports: [
    PortfolioModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.STAGE}`],
    }),
    AuthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          type: 'postgres',
          autoLoadEntities: true,
          synchronize: false,
          entities: [
            User,
            Portfolio,
            Transaction,
            Balance,
            Storage,
            History,
            FixedPnl,
          ],
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        };
      },
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
    }),
    ScheduleModule.forRoot(),
    TransactionsModule,
    WebsocketModule,
    GatewayModule,
    IntegrationsModule,
    SharedModule,
    WatchlistModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    UsersRepository,
    AssetsRepository,
    IsAssetValidConstraint,
  ],
  exports: [JwtStrategy],
})
export class AppModule {}
