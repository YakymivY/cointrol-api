import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Storage } from './storage.entity';

@Entity()
export class Transaction {
  @Index()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

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
  amount: number;

  @Column('decimal', {
    precision: 18,
    scale: 8,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @ManyToOne(() => Storage, { eager: true, nullable: true })
  @JoinTable({ name: 'storageId' })
  storage: Storage;

  @Column('timestamp')
  timestamp: Date;
}
