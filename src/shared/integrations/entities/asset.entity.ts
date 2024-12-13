import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ticker: string;

  @Column()
  name: string;
}
