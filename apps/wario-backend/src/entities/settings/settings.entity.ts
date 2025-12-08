import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import type { IWSettings } from '@wcp/wario-shared';

/**
 * Settings entity - singleton table for application-wide configuration.
 * Not temporal since there's only ever one active settings document.
 */
@Entity('settings')
export class SettingsEntity implements IWSettings {
  @PrimaryGeneratedColumn('uuid')
  rowId!: string;

  @Column('jsonb')
  config!: Record<string, string | number | boolean>;

  @Column('varchar', { length: 255 })
  LOCATION_NAME!: string;

  @Column('varchar', { length: 50 })
  SQUARE_LOCATION!: string;

  @Column('varchar', { length: 50 })
  SQUARE_LOCATION_ALTERNATE!: string;

  @Column('varchar', { length: 50 })
  SQUARE_APPLICATION_ID!: string;

  @Column({ type: 'varchar', length: 36 })
  DEFAULT_FULFILLMENTID!: string;

  @Column('float', { default: 0 })
  TAX_RATE!: number;

  @Column('boolean', { default: false })
  ALLOW_ADVANCED!: boolean;

  @Column('varchar', { length: 255 })
  TIP_PREAMBLE!: string;

  @Column('varchar', { length: 255 })
  LOCATION_PHONE_NUMBER!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
