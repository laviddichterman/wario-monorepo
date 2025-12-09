import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

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

import type { ProductInstanceEntity } from './product-instance.entity';

// Use string reference to avoid circular dependency
@Entity('products')
export class ProductEntity extends TemporalEntity implements IProduct {
  @Column({ type: 'varchar', length: 36 })
  baseProductId!: string;

  @ManyToOne('ProductInstanceEntity', { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'baseProductId', referencedColumnName: 'id' })
  baseProduct?: ProductInstanceEntity;

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

  @Column('text', { array: true, default: [] })
  category_ids!: string[];

  @Column({ type: 'varchar', length: 36, nullable: true })
  printerGroup!: string | null;

  @OneToMany('ProductInstanceEntity', 'product')
  instances?: ProductInstanceEntity[];
}
