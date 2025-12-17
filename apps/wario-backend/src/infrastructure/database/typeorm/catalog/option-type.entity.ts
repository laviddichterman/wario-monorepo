import { Column, Entity } from 'typeorm';

import type { IOptionType, IOptionTypeDisplayFlags, KeyValue } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

/**
 * Option type (modifier group) entity with 2025 schema.
 * Ordering of options embedded in `options` array.
 * Still has ordinal for ordering modifier groups relative to each other.
 */
@Entity('option_types')
export class OptionTypeEntity extends TemporalEntity implements IOptionType {
  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName!: string;

  @Column('jsonb', { default: [] })
  externalIDs!: KeyValue[];

  @Column('int')
  ordinal!: number;

  @Column('int')
  min_selected!: number;

  @Column('int', { nullable: true })
  max_selected!: number | null;

  @Column('jsonb')
  displayFlags!: IOptionTypeDisplayFlags;

  /** Ordered list of option IDs in this modifier group */
  @Column('text', { array: true, default: [] })
  options!: string[];
}
