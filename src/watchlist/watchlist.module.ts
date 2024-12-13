import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchlist } from './entities/watchlist.entity';
import { AuthModule } from 'src/auth/auth.module';
import { WatchlistRepository } from './repositories/watchlist.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist]), AuthModule],
  providers: [WatchlistService, WatchlistRepository],
  controllers: [WatchlistController],
})
export class WatchlistModule {}
