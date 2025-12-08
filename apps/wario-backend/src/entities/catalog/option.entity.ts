import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

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

import type { OptionTypeEntity } from './option-type.entity';

// Use string reference to avoid circular dependency
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

  @Column('int')
  ordinal!: number;

  @Column({ type: 'varchar', length: 36 })
  modifierTypeId!: string;

  @ManyToOne('OptionTypeEntity', 'options')
  @JoinColumn({ name: 'modifierTypeId' })
  modifierType?: OptionTypeEntity;

  @Column('jsonb')
  metadata!: IOptionMetadata;

  @Column({ type: 'varchar', length: 36, nullable: true })
  enable!: string | null;

  @Column('jsonb')
  displayFlags!: IOptionDisplayFlags;
}

