import type { Polygon } from 'geojson';
import { Column, Entity } from 'typeorm';

import type {
  DateIntervalsEntries,
  FulfillmentAutograt,
  FulfillmentConfig,
  FulfillmentMessages,
  FulfillmentType,
  OperatingHourSpecification,
} from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

@Entity('fulfillments')
export class FulfillmentEntity extends TemporalEntity implements FulfillmentConfig {
  @Column()
  displayName!: string;

  @Column()
  shortcode!: string;

  @Column()
  exposeFulfillment!: boolean;

  @Column('int')
  ordinal!: number;

  @Column({ type: 'varchar', length: 20 })
  service!: FulfillmentType;

  @Column()
  allowPrepayment!: boolean;

  @Column()
  requirePrepayment!: boolean;

  @Column()
  allowTipping!: boolean;

  @Column({ type: 'varchar', length: 36 })
  menuBaseCategoryId!: string;

  @Column({ type: 'varchar', length: 36 })
  orderBaseCategoryId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  orderSupplementaryCategoryId!: string | null;

  @Column('jsonb')
  messages!: FulfillmentMessages;

  @Column('text', { array: true, default: [] })
  terms!: string[];

  @Column('jsonb', { nullable: true })
  autograt!: FulfillmentAutograt | null;

  /**
   * ID reference to an OrderInstanceFunction that calculates the service charge.
   */
  @Column({ type: 'varchar', length: 36, nullable: true })
  serviceCharge!: string | null;

  @Column('int')
  leadTime!: number;

  @Column('int', { default: 0 })
  leadTimeOffset!: number;

  @Column('jsonb')
  operatingHours!: OperatingHourSpecification;

  @Column('jsonb', { default: [] })
  specialHours!: DateIntervalsEntries;

  @Column('jsonb', { default: [] })
  blockedOff!: DateIntervalsEntries;

  @Column('int')
  minDuration!: number;

  @Column('int')
  maxDuration!: number;

  @Column('int')
  timeStep!: number;

  @Column('int', { nullable: true })
  maxGuests?: number;

  /**
   * GeoJSON Polygon defining the delivery service area.
   */
  @Column('jsonb', { nullable: true })
  serviceArea?: Polygon;
}


