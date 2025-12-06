import { useAtom, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { PrinterGroup } from '@wcp/wario-shared';

import { useEditPrinterGroupMutation, usePrinterGroupById } from '@/hooks/usePrinterGroupsQuery';

import { createNullGuard } from '@/components/wario/catalog-null-guard';

import {
  fromPrinterGroupEntity,
  printerGroupFormAtom,
  printerGroupFormProcessingAtom,
  toPrinterGroupApiBody,
} from '@/atoms/forms/printerGroupFormAtoms';

import type { PrinterGroupEditProps } from './PrinterGroupComponent';
import { PrinterGroupComponent } from './PrinterGroupComponent';

// Create null guard at module level to follow Rules of Hooks
const PrinterGroupNullGuard = createNullGuard(usePrinterGroupById);

const PrinterGroupEditContainer = ({ printerGroupId, onCloseCallback }: PrinterGroupEditProps) => {
  return (
    <PrinterGroupNullGuard
      id={printerGroupId}
      child={(printerGroup) => (
        <PrinterGroupEditContainerInner printerGroup={printerGroup} onCloseCallback={onCloseCallback} />
      )}
    />
  );
};

const PrinterGroupEditContainerInner = ({
  printerGroup,
  onCloseCallback,
}: {
  printerGroup: PrinterGroup;
  onCloseCallback: () => void;
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const editMutation = useEditPrinterGroupMutation();

  const setFormState = useSetAtom(printerGroupFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(printerGroupFormProcessingAtom);

  useEffect(() => {
    setFormState(fromPrinterGroupEntity(printerGroup));
    return () => {
      setFormState(null);
    };
  }, [printerGroup, setFormState]);

  const editPrinterGroup = () => {
    setFormState((current) => {
      if (!current || isProcessing) return current;

      setIsProcessing(true);
      const body = toPrinterGroupApiBody(current);

      editMutation.mutate(
        { ...body, id: printerGroup.id },
        {
          onSuccess: () => {
            enqueueSnackbar(`Updated printer group: ${current.name}.`);
          },
          onError: (error) => {
            enqueueSnackbar(
              `Unable to update printer group: ${current.name}. Got error ${JSON.stringify(error, null, 2)}`,
              { variant: 'error' },
            );
            console.error(error);
          },
          onSettled: () => {
            setIsProcessing(false);
            onCloseCallback();
          },
        },
      );
      return current;
    });
  };
  return (
    <PrinterGroupComponent confirmText="Save" onCloseCallback={onCloseCallback} onConfirmClick={editPrinterGroup} />
  );
};

export default PrinterGroupEditContainer;
