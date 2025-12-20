import {
  type CreateIProductInstanceRequestDto,
  type CreateIProductRequestDto,
  type IProduct,
  type PrinterGroup,
  type UpdateIProductInstanceRequestDto,
  type UpdateIProductRequestDto,
  type UpsertIProductInstanceRequest,
  type UpsertIProductRequestInstancesDto,
} from '@wcp/wario-shared';

// Shared helper for determining Square locations based on 3P flag
export const LocationsConsidering3pFlag = (
  is3p: boolean,
  squareLocationAlternate: string,
  squareLocation: string,
  squareLocation3p: string | undefined,
): string[] => [squareLocationAlternate, ...(is3p && squareLocation3p ? [squareLocation3p] : [squareLocation])];

export type UpsertProductInstanceProps = {
  piid: string;
  product: Pick<IProduct, 'price' | 'modifiers' | 'printerGroup' | 'disabled' | 'displayFlags'>;
  productInstance: UpsertIProductInstanceRequest;
};
export type UpdatePrinterGroupProps = {
  id: string;
  printerGroup: Partial<Omit<PrinterGroup, 'id'>>;
};

export function isUpdateProduct(
  batch: CreateIProductRequestDto | UpdateIProductRequestDto,
): batch is UpdateIProductRequestDto {
  return 'id' in batch;
}

export function isUpdateProductInstance(
  instance: UpsertIProductRequestInstancesDto,
): instance is UpdateIProductInstanceRequestDto {
  return typeof instance === 'object' && 'id' in instance;
}

export function isCreateProductInstance(
  instance: UpsertIProductRequestInstancesDto,
): instance is CreateIProductInstanceRequestDto {
  return typeof instance === 'object' && !('id' in instance);
}
