import { Column, Entity } from 'typeorm';

import type {
  IMoney,
  IOption,
  IOptionDisplayFlags,
  IOptionMetadata,
  IRecurringInterval,
  IWInterval,
  KeyValue,
} from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

/**
 * Option entity with 2025 schema.
 * No longer has ordinal or modifierTypeId - ordering and membership is via OptionType.options array.
 */
@Entity('options')
export class OptionEntity extends TemporalEntity implements IOption {
  @Column()
  displayName!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column()
  shortcode!: string;

  @Column('jsonb')
  price!: IMoney;

  @Column('jsonb', { default: [] })
  externalIDs!: KeyValue[];

  @Column('jsonb', { nullable: true })
  disabled!: IWInterval | null;

  @Column('jsonb', { default: [] })
  availability!: IRecurringInterval[];

  @Column('jsonb')
  metadata!: IOptionMetadata;

  @Column({ type: 'varchar', length: 36, nullable: true })
  enable!: string | null;

  @Column('jsonb')
  displayFlags!: IOptionDisplayFlags;
}
