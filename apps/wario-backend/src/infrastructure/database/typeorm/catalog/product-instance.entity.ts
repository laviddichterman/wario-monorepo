import { Column, Entity } from 'typeorm';

import type {
  IProductInstance,
  IProductInstanceDisplayFlags,
  KeyValue,
  ProductInstanceModifierEntry,
} from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

@Entity('product_instances')
export class ProductInstanceEntity extends TemporalEntity implements IProductInstance {
  @Column('jsonb', { default: [] })
  modifiers!: ProductInstanceModifierEntry[];

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
