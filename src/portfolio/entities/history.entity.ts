import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Portfolio } from './portfolio.entity';

@Entity()
export class History {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn()
  asset: string;

  @Column('decimal', {
    precision: 20,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  allTimePnl: number;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToOne(() => Portfolio, (portfolio) => portfolio.history, {
    nullable: true,
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  @JoinColumn({ name: 'asset', referencedColumnName: 'asset' })
  portfolio?: Portfolio;
}
