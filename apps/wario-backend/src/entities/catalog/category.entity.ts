import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { CategoryDisplayFlags, ICategory } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

@Entity('categories')
export class CategoryEntity extends TemporalEntity implements ICategory {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string | null;

  @Column('int')
  ordinal!: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  parent_id!: string | null;

  @ManyToOne(() => CategoryEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: CategoryEntity;

  @Column({ nullable: true })
  subheading!: string | null;

  @Column({ nullable: true })
  footnotes!: string | null;

  @Column('jsonb')
  display_flags!: CategoryDisplayFlags;

  @Column('text', { array: true, default: [] })
  serviceDisable!: string[];
}
