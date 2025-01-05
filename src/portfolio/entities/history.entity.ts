import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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
}
