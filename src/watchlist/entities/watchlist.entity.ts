import { ThresholdDirection } from 'src/shared/enums/threshold-direction.enum';
import { WatchlistStatus } from 'src/shared/enums/watchlist-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Watchlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column()
  asset: string;

  @Column('decimal', {
    precision: 20,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price_threshold: number;

  @Column({
    type: 'enum',
    enum: ThresholdDirection,
    default: ThresholdDirection.ABOVE,
  })
  threshold_direction: string;

  @Column({
    type: 'enum',
    enum: WatchlistStatus,
    default: WatchlistStatus.ACTIVE,
  })
  status: string;

  @Column()
  telegram_username: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
