import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { Button } from '@mui/material';

import type { PrinterGroup } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useEditPrinterGroupMutation, usePrinterGroupById } from '@/hooks/usePrinterGroupsQuery';

import { toast } from '@/components/snackbar';
import { createNullGuard } from '@/components/wario/catalog-null-guard';

import {
  fromPrinterGroupEntity,
  printerGroupFormAtom,
  printerGroupFormDirtyFieldsAtom,
  printerGroupFormProcessingAtom,
  toPrinterGroupApiBody,
} from '@/atoms/forms/printerGroupFormAtoms';

import { PrinterGroupFormBody } from './PrinterGroupComponent';

export interface PrinterGroupEditProps {
  printerGroupId: string | null;
  onCloseCallback: VoidFunction;
}

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
  const editMutation = useEditPrinterGroupMutation();

  const setFormState = useSetAtom(printerGroupFormAtom);
  const [dirtyFields, setDirtyFields] = useAtom(printerGroupFormDirtyFieldsAtom);
  const [isProcessing, setIsProcessing] = useAtom(printerGroupFormProcessingAtom);

  useEffect(() => {
    setFormState(fromPrinterGroupEntity(printerGroup));
    setDirtyFields(new Set());
    return () => {
      setFormState(null);
      setDirtyFields(new Set());
    };
  }, [printerGroup, setFormState, setDirtyFields]);

  const editPrinterGroup = () => {
    setFormState((current) => {
      if (!current || isProcessing) return current;

      setIsProcessing(true);
      const body = toPrinterGroupApiBody(current);

      editMutation.mutate(
        { ...body, id: printerGroup.id },
        {
          onSuccess: () => {
            toast.success(`Updated printer group: ${current.name}.`);
          },
          onError: (error) => {
            toast.error(`Unable to update printer group: ${current.name}. Got error ${JSON.stringify(error, null, 2)}`);
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
    <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
      <AppDialog.Header onClose={onCloseCallback} title="Edit Printer Group" />
      <AppDialog.Content>
        <PrinterGroupFormBody />
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onCloseCallback} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={editPrinterGroup} disabled={isProcessing || dirtyFields.size === 0} variant="contained">
          Save
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
};

export default PrinterGroupEditContainer;
