import { Storage } from 'src/transactions/entities/storage.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { History } from './history.entity';

@Entity()
export class Portfolio {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn()
  asset: string;

  @Column('decimal', {
    precision: 20,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column('decimal', {
    precision: 18,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  averageEntryPrice: number;

  @ManyToMany(() => Storage, { eager: true, nullable: true })
  @JoinTable({
    name: 'portfolio_storage',
    joinColumns: [
      { name: 'portfolio_userId', referencedColumnName: 'userId' },
      { name: 'portfolio_asset', referencedColumnName: 'asset' },
    ],
    inverseJoinColumns: [{ name: 'storage_id', referencedColumnName: 'id' }],
  })
  storages: Storage[];

  @OneToOne(() => History, (history) => history.portfolio)
  history: History;
}
