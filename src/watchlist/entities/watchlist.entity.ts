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

  @Column({ default: 'active' })
  status: string;

  @Column()
  telegram_username: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
