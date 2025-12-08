import type { PrinterGroup } from '@wcp/wario-shared';

export interface IPrinterGroupRepository {
  findById(id: string): Promise<PrinterGroup | null>;
  findAll(): Promise<PrinterGroup[]>;
  create(group: Omit<PrinterGroup, 'id'>): Promise<PrinterGroup>;
  update(id: string, partial: Partial<Omit<PrinterGroup, 'id'>>): Promise<PrinterGroup | null>;
  delete(id: string): Promise<boolean>;
}

export const PRINTER_GROUP_REPOSITORY = Symbol('IPrinterGroupRepository');
