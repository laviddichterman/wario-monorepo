import { Column, Entity } from 'typeorm';

import type { KeyValue, PrinterGroup } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

/**
 * PrinterGroup entity - groups products for specific printers.
 * Temporal (SCD2) as printer groups are part of catalog configuration.
 */
@Entity('printer_group')
export class PrinterGroupEntity extends TemporalEntity implements PrinterGroup {
  @Column('varchar', { length: 255 })
  name!: string;

  @Column('boolean', { default: false })
  singleItemPerTicket!: boolean;

  @Column('boolean', { default: false })
  isExpo!: boolean;

  @Column('jsonb', { default: [] })
  externalIDs!: KeyValue[];
}
