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
          synchronize: true,
          entities: [User, Portfolio, Transaction],
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
    TransactionsModule,
    WebsocketModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, UsersRepository],
  exports: [JwtStrategy],
})
export class AppModule {}
