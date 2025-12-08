import { Column, Entity, OneToMany } from 'typeorm';

import type { IOptionType, IOptionTypeDisplayFlags, KeyValue } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

// Forward reference - OptionEntity imports this file
import type { OptionEntity } from './option.entity';

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

  @OneToMany('OptionEntity', 'modifierType')
  options?: OptionEntity[];
}

