import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * KeyValue entity - simple key-value store.
 * Non-temporal as key-value pairs are simple configuration.
 */
@Entity('key_value')
export class KeyValueEntity {
  @PrimaryGeneratedColumn('uuid')
  rowId!: string;

  @Column('varchar', { length: 255, unique: true })
  key!: string;

  @Column('text')
  value!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
