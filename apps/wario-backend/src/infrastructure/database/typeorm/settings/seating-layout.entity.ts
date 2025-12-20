import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingLayout } from '@wcp/wario-shared';

/**
 * SeatingLayout entity - represents a named layout configuration.
 * Contains floor IDs that reference SeatingFloor entities.
 * Display order is determined by array position.
 */
@Entity('seating_layout')
export class SeatingLayoutEntity implements SeatingLayout {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  /** Array of floor IDs, in display order */
  @Column('text', { array: true, default: [] })
  floors!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
