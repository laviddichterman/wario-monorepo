import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { SeatingResource } from '@wcp/wario-shared';
import { SeatingShape } from '@wcp/wario-shared';

/**
 * SeatingResource entity - represents a table or seating area.
 * Non-temporal as seating resources are configuration.
 */
@Entity('seating_resource')
export class SeatingResourceEntity implements SeatingResource {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('int')
  capacity!: number;

  @Column('varchar', { length: 20 })
  shape!: SeatingShape;

  @Column('varchar', { length: 36 })
  sectionId!: string;

  @Column('jsonb')
  center!: { x: number; y: number };

  @Column('jsonb')
  shapeDims!: { x: number; y: number };

  @Column('float')
  rotation!: number;

  @Column('boolean', { default: false })
  disabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
