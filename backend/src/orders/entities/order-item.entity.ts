import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Product } from '../../products/entities/product.entity.js';
import type { Order } from './order.entity.js';

@Entity('order_items')
@Index(['orderId'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Order', 'items', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column({ type: 'integer' })
  orderId!: number;

  @ManyToOne('Product', {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'integer' })
  productId!: number;

  @Column({ type: 'varchar', length: 1 })
  size!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'integer' })
  lineTotal!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  toppings!: string[];
}
