import { useAtom, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { Button } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useAddPrinterGroupMutation } from '@/hooks/usePrinterGroupsQuery';

import {
  DEFAULT_PRINTER_GROUP_FORM,
  printerGroupFormAtom,
  printerGroupFormProcessingAtom,
  toPrinterGroupApiBody,
} from '@/atoms/forms/printerGroupFormAtoms';

import { PrinterGroupFormBody } from './PrinterGroupComponent';

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

  return (
    <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
      <AppDialog.Header onClose={onCloseCallback} title="Add Printer Group" />
      <AppDialog.Content>
        <PrinterGroupFormBody />
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onCloseCallback} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={addPrinterGroup} disabled={isProcessing} variant="contained">
          Add
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
};

export default PrinterGroupAddContainer;
