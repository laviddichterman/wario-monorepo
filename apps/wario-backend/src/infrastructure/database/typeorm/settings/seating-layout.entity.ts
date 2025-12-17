import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingLayout } from '@wcp/wario-shared';

/**
 * SeatingLayout entity - represents a named layout configuration.
 * The layout references floors, sections, resources, and placements stored in separate tables.
 * This entity stores the layout metadata (id, name) and can be used to query related entities.
 * Non-temporal as seating layouts are configuration.
 */
@Entity('seating_layout')
export class SeatingLayoutEntity implements Omit<SeatingLayout, 'floors' | 'sections' | 'resources' | 'placements'> {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
