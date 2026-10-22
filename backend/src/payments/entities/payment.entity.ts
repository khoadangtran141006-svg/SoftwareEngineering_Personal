import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payments')
@Index(['orderId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 100 })
  idempotencyKey!: string;

  @Column({ type: 'integer' })
  orderId!: number;

  @Column({ type: 'varchar', length: 30 })
  method!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: 'SUCCEEDED' | 'FAILED';

  @Column({ type: 'integer' })
  amount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
