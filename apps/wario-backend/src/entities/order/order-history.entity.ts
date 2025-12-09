import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { OrderEntity } from './order.entity';

export type OrderHistoryAction = 'CREATED' | 'STATUS_CHANGE' | 'MODIFIED' | 'PAYMENT_ADDED' | 'REFUND_ISSUED';

/**
 * Temporal history table for order state changes.
 * Records status transitions, modifications, payments, and refunds.
 */
@Entity('order_history')
export class OrderHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  orderId!: string;

  @ManyToOne(() => OrderEntity)
  @JoinColumn({ name: 'orderId', referencedColumnName: 'id' })
  order?: OrderEntity;

  @Column({ type: 'varchar', length: 20 })
  action!: OrderHistoryAction;

  @Column('jsonb', { nullable: true })
  previousState!: Partial<OrderEntity> | null;

  @Column('jsonb')
  newState!: Partial<OrderEntity>;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp!: Date;
}
