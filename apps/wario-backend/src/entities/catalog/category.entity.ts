import { Column, Entity } from 'typeorm';

import type { CategoryDisplayFlags, ICategory } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

@Entity('categories')
export class CategoryEntity extends TemporalEntity implements ICategory {
  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { nullable: true })
  subheading!: string | null;

  @Column('text', { nullable: true })
  footnotes!: string | null;

  @Column('jsonb')
  display_flags!: CategoryDisplayFlags;

  @Column('text', { array: true, default: [] })
  serviceDisable!: string[];

  /** Ordered list of child category IDs */
  @Column('text', { array: true, default: [] })
  children!: string[];

  /** Ordered list of product IDs in this category */
  @Column('text', { array: true, default: [] })
  products!: string[];
}
