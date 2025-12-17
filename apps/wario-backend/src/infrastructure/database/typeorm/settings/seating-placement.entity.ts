import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingPlacement } from '@wcp/wario-shared';

/**
 * SeatingPlacement entity - represents where a seating resource is positioned.
 * Stores location (centerX, centerY) and rotation for a resource within a section.
 * Non-temporal as seating placements are configuration.
 */
@Entity('seating_placement')
export class SeatingPlacementEntity implements SeatingPlacement {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 36 })
  sectionId!: string;

  @Column('int')
  centerX!: number;

  @Column('int')
  centerY!: number;

  @Column('int')
  rotation!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
