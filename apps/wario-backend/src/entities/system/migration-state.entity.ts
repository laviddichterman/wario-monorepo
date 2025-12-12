import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const MigrationStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type MigrationStatus = (typeof MigrationStatus)[keyof typeof MigrationStatus];

@Entity('migration_state')
export class MigrationStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  collectionName!: string;

  @Column({ type: 'varchar', nullable: true })
  lastMigratedId?: string; // MongoDB _id of the last successfully migrated document

  @Column({
    type: 'varchar',
    default: MigrationStatus.PENDING,
  })
  status!: MigrationStatus;

  @Column({ type: 'int', default: 0 })
  migratedCount!: number;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
