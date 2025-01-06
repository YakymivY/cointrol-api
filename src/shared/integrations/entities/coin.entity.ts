import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Coin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  coingeckoId: string;

  @Column()
  symbol: string;

  @Column()
  name: string;
}
