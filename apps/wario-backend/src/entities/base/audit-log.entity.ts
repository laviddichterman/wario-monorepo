import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Generic audit log for tracking all changes to entities.
 * Records INSERT, UPDATE, DELETE operations with before/after state.
 */
@Entity('audit_log')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  entityType!: string;

  @Index()
  @Column()
  entityId!: string;

  @Column({ type: 'varchar', length: 10 })
  action!: 'INSERT' | 'UPDATE' | 'DELETE';

  @Column('jsonb', { nullable: true })
  previousData!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  newData!: Record<string, unknown> | null;

  @Column({ nullable: true })
  userId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp!: Date;
}
