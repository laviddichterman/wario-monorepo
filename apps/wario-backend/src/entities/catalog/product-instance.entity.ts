import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type {
  IProductInstance,
  IProductInstanceDisplayFlags,
  KeyValue,
  ProductModifierEntry,
} from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

import type { ProductEntity } from './product.entity';

@Entity('product_instances')
export class ProductInstanceEntity extends TemporalEntity implements IProductInstance {
  @Column({ type: 'varchar', length: 36 })
  productId!: string;

  @ManyToOne('ProductEntity', 'instances', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product?: ProductEntity;

  @Column('int', { default: 0 })
  ordinal!: number;

  @Column('jsonb', { default: [] })
  modifiers!: ProductModifierEntry[];

  @Column()
  displayName!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column()
  shortcode!: string;

  @Column('jsonb', { default: [] })
  externalIDs!: KeyValue[];

  @Column('jsonb')
  displayFlags!: IProductInstanceDisplayFlags;
}

