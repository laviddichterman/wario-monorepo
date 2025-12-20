import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingFloor } from '@wcp/wario-shared';

/**
 * SeatingFloor entity - represents a floor in the restaurant layout.
 * Non-temporal as seating floors are configuration.
 *
 * Display order is determined by array position in SeatingLayout.floors,
 * not by an ordinal field on the floor itself.
 */
@Entity('seating_floor')
export class SeatingFloorEntity implements SeatingFloor {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('boolean', { default: false })
  disabled!: boolean;

  /** Array of section IDs, in display order */
  @Column('text', { array: true, default: [] })
  sections!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
