import { atom, useAtomValue } from 'jotai';

import type { KeyValue, PrinterGroup } from '@wcp/wario-shared/types';

/**
 * Form state for PrinterGroup add/edit operations.
 */
export interface PrinterGroupFormState {
  name: string;
  singleItemPerTicket: boolean;
  isExpo: boolean;
  externalIds: KeyValue[];
}

/** Default values for "Add" mode */
export const DEFAULT_PRINTER_GROUP_FORM: PrinterGroupFormState = {
  name: '',
  singleItemPerTicket: false,
  isExpo: false,
  externalIds: [],
};

/** Main form atom - null when no form is open */
export const printerGroupFormAtom = atom<PrinterGroupFormState | null>(null);

/** API processing state */
export const printerGroupFormProcessingAtom = atom(false);

/** Validation derived atom */
export const printerGroupFormIsValidAtom = atom((get) => {
  const form = get(printerGroupFormAtom);
  if (!form) return false;

  if (form.name.length === 0) return false;

  return true;
});

/** Convert form state to API request body */
export const toPrinterGroupApiBody = (form: PrinterGroupFormState): Omit<PrinterGroup, 'id' | 'printer_ids'> => ({
  name: form.name,
  singleItemPerTicket: form.singleItemPerTicket,
  isExpo: form.isExpo,
  externalIDs: form.externalIds,
});

/** Convert API entity to form state */
export const fromPrinterGroupEntity = (entity: PrinterGroup): PrinterGroupFormState => ({
  name: entity.name,
  singleItemPerTicket: entity.singleItemPerTicket,
  isExpo: entity.isExpo,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  externalIds: entity.externalIDs || [],
});

export const usePrinterGroupForm = () => {
  const form = useAtomValue(printerGroupFormAtom);
  const isValid = useAtomValue(printerGroupFormIsValidAtom);
  const isProcessing = useAtomValue(printerGroupFormProcessingAtom);
  return { form, isValid, isProcessing };
};
