import { useAtom, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useAddPrinterGroupMutation } from '@/hooks/usePrinterGroupsQuery';

import {
  DEFAULT_PRINTER_GROUP_FORM,
  printerGroupFormAtom,
  printerGroupFormProcessingAtom,
  toPrinterGroupApiBody,
} from '@/atoms/forms/printerGroupFormAtoms';

import { PrinterGroupComponent } from './PrinterGroupComponent';

export interface PrinterGroupAddContainerProps {
  onCloseCallback: VoidFunction;
}

const PrinterGroupAddContainer = ({ onCloseCallback }: PrinterGroupAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const addMutation = useAddPrinterGroupMutation();

  const setFormState = useSetAtom(printerGroupFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(printerGroupFormProcessingAtom);

  useEffect(() => {
    setFormState(DEFAULT_PRINTER_GROUP_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addPrinterGroup = () => {
    setFormState((current) => {
      if (!current || isProcessing) return current;

      setIsProcessing(true);
      const body = toPrinterGroupApiBody(current);

      addMutation.mutate(body, {
        onSuccess: () => {
          enqueueSnackbar(`Added new printer group: ${current.name}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to add printer group: ${current.name}. Got error: ${JSON.stringify(error, null, 2)}.`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      });
      return current;
    });
  };

  return <PrinterGroupComponent confirmText="Add" onCloseCallback={onCloseCallback} onConfirmClick={addPrinterGroup} />;
};

export default PrinterGroupAddContainer;
