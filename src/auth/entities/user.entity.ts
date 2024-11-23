import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @Index()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}
