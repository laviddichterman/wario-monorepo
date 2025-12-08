import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Abstract base class for temporal catalog entities.
 * Provides versioning via validFrom/validTo timestamps for point-in-time queries.
 *
 * - `rowId`: PostgreSQL primary key (new per temporal version)
 * - `id`: Logical entity ID = MongoDB _id (stable across versions)
 * - `validTo = null`: This is the current/active version
 * - Query pattern: WHERE id = ? AND validFrom <= ? AND (validTo IS NULL OR validTo > ?)
 */
export abstract class TemporalEntity {
  @PrimaryGeneratedColumn('uuid')
  rowId!: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  id!: string;

  @Index()
  @Column({ type: 'timestamptz' })
  validFrom!: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
