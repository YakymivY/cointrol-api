import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';

@Injectable()
export class AssetsRepository extends Repository<Asset> {
  constructor(private dataSource: DataSource) {
    super(Asset, dataSource.createEntityManager());
  }
}
