import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { OrderItem } from './order-item.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('orders')
// Lịch sử đơn của khách (GET /orders/me) và dọn đơn quá hạn lọc theo các cột này.
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 30 })
  orderCode!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'PENDING',
  })
  status!: string;

  @Column({ type: 'integer' })
  total!: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'integer', nullable: true })
  userId!: number | null;

  @ManyToOne('User', 'orders', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user!: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany('OrderItem', 'order', {
    cascade: true,
  })
  items!: OrderItem[];
}
