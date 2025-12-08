import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { SEMVER } from '@wcp/wario-shared';

/**
 * DBVersion entity - singleton table for API versioning.
 * Not temporal since there's only ever one active version.
 */
@Entity('db_version')
export class DBVersionEntity implements SEMVER {
  @PrimaryGeneratedColumn('uuid')
  rowId!: string;

  @Column('int')
  major!: number;

  @Column('int')
  minor!: number;

  @Column('int')
  patch!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
