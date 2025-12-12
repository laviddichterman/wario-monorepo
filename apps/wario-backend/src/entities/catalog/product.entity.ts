import { Column, Entity } from 'typeorm';

import type {
  IMoney,
  IProduct,
  IProductDisplayFlags,
  IProductModifier,
  IRecurringInterval,
  IWInterval,
  KeyValue,
  PrepTiming,
} from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

/**
 * Product entity with 2025 schema.
 * Ordering of instances embedded in `instances` array.
 * First element of `instances` is the base/default product instance.
 * Products are referenced by Category.products instead of having category_ids.
 */
@Entity('products')
export class ProductEntity extends TemporalEntity implements IProduct {
  @Column('jsonb')
  price!: IMoney;

  @Column('jsonb', { nullable: true })
  disabled!: IWInterval | null;

  @Column('jsonb', { default: [] })
  externalIDs!: KeyValue[];

  @Column('text', { array: true, default: [] })
  serviceDisable!: string[];

  @Column('jsonb')
  displayFlags!: IProductDisplayFlags;

  @Column('jsonb', { nullable: true })
  timing!: PrepTiming | null;

  @Column('jsonb', { default: [] })
  availability!: IRecurringInterval[];

  @Column('jsonb', { default: [] })
  modifiers!: IProductModifier[];

  @Column({ type: 'varchar', length: 36, nullable: true })
  printerGroup!: string | null;

  /** Ordered list of product instance IDs. First element is the base/default instance. */
  @Column('text', { array: true, default: [] })
  instances!: string[];
}
