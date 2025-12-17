import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingFloor } from '@wcp/wario-shared';

/**
 * SeatingFloor entity - represents a floor in the restaurant layout.
 * Non-temporal as seating floors are configuration.
 */
@Entity('seating_floor')
export class SeatingFloorEntity implements SeatingFloor {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('int')
  ordinal!: number;

  @Column('boolean', { default: false })
  disabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
