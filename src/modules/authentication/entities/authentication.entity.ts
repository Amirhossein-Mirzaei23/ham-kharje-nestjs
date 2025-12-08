import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Authentication  {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({unique: true})
  phone: string;
}