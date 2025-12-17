import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import type {
  CoreCartEntry,
  CustomerInfoData,
  FulfillmentData,
  KeyValueOrder,
  Metrics,
  OrderLineDiscount,
  OrderTax,
  WOrderInstance,
  WOrderStatus,
} from '@wcp/wario-shared';

import { CatalogVersionEntity } from '../catalog/catalog-version.entity';

/**
 * Order entity with reference to catalog version for historical pricing.
 * Uses PrimaryColumn (not generated) to preserve MongoDB ObjectIds.
 */
@Entity('orders')
export class OrderEntity implements WOrderInstance {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  status!: WOrderStatus;

  @Column('jsonb')
  customerInfo!: CustomerInfoData;

  @Column('jsonb')
  fulfillment!: FulfillmentData;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  fulfillmentDate!: string;

  @Column('jsonb', { default: [] })
  cart!: CoreCartEntry[];

  @Column('jsonb', { default: [] })
  discounts!: OrderLineDiscount[];

  @Column('jsonb', { default: [] })
  payments!: WOrderInstance['payments'];

  @Column('jsonb', { default: [] })
  refunds!: WOrderInstance['refunds'];

  @Column('jsonb', { nullable: true })
  metrics!: Metrics;

  @Column('jsonb', { default: [] })
  taxes!: OrderTax[];

  @Column('jsonb')
  tip!: WOrderInstance['tip'];

  @Column('jsonb', { default: [] })
  metadata!: KeyValueOrder[];

  @Column({ type: 'text', nullable: true })
  specialInstructions?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  locked!: string | null;

  /**
   * Reference to catalog version at order creation time.
   * Allows historical lookup of prices, product names, tax rates, etc.
   */
  @Column({ type: 'uuid' })
  catalogVersionId!: string;

  @ManyToOne(() => CatalogVersionEntity)
  @JoinColumn({ name: 'catalogVersionId' })
  catalogVersion?: CatalogVersionEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
