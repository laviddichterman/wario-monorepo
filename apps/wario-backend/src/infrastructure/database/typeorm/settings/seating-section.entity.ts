import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

/**
 * SeatingSection entity - represents a section within a floor.
 * Non-temporal as seating sections are configuration.
 */
@Entity('seating_section')
export class SeatingSectionEntity implements SeatingLayoutSection {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 36 })
  floorId!: string;

  @Column('int')
  ordinal!: number;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('boolean', { default: false })
  disabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
