import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Portfolio {
  @PrimaryColumn()
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
}
