import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { SEMVER } from '@wcp/wario-shared';

/**
 * Lightweight timestamp marker for catalog versions.
 * Catalog is reconstructed via temporal queries on catalog entities.
 */
@Entity('catalog_versions')
export class CatalogVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('jsonb')
  version!: SEMVER;

  @Index()
  @Column({ type: 'timestamptz' })
  effectiveAt!: Date;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
