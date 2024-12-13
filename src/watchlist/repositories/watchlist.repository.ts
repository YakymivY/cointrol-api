import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Watchlist } from '../entities/watchlist.entity';

@Injectable()
export class WatchlistRepository extends Repository<Watchlist> {
  constructor(private dataSource: DataSource) {
    super(Watchlist, dataSource.createEntityManager());
  }
}
