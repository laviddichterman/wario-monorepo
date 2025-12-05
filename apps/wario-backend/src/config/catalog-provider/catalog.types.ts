import {
  type CreateProductBatchRequest,
  type IOption,
  type IOptionType,
  type IProduct,
  type IProductInstance,
  type PrinterGroup,
  type UncommittedIProductInstance,
  type UpdateIProductUpdateIProductInstance,
  type UpdateProductBatchRequest,
} from '@wcp/wario-shared';

// Shared helper for determining Square locations based on 3P flag
export const LocationsConsidering3pFlag = (
  is3p: boolean,
  squareLocationAlternate: string,
  squareLocation: string,
  squareLocation3p: string | undefined,
): string[] => [
    squareLocationAlternate,
    ...(is3p && squareLocation3p ? [squareLocation3p] : [squareLocation]),
  ];

export type UpdateProductInstanceProps = {
  piid: string;
  product: Pick<IProduct, 'price' | 'modifiers' | 'printerGroup' | 'disabled' | 'displayFlags'>;
  productInstance: Partial<Omit<IProductInstance, 'id' | 'productId'>>;
};

export type UpdateModifierTypeProps = {
  id: string;
  modifierType: Partial<Omit<IOptionType, 'id'>>;
};

export type UpdatePrinterGroupProps = {
  id: string;
  printerGroup: Partial<Omit<PrinterGroup, 'id'>>;
};

export type UpdateModifierOptionProps = {
  id: string;
  modifierTypeId: string;
  modifierOption: Partial<Omit<IOption, 'id' | 'modifierTypeId'>>;
};

export type UncommitedOption = Omit<IOption, 'modifierTypeId' | 'id'>;
export type UpsertOption = (Partial<UncommitedOption> & Pick<IOption, 'id'>) | UncommitedOption;

export function isUpdateProduct(
  batch: CreateProductBatchRequest | UpdateProductBatchRequest,
): batch is UpdateProductBatchRequest {
  return 'product' in batch && 'id' in batch.product;
}

export function isUpdateProductInstance(
  instance: UncommittedIProductInstance | UpdateIProductUpdateIProductInstance,
): instance is UpdateIProductUpdateIProductInstance {
  return 'id' in instance;
}

