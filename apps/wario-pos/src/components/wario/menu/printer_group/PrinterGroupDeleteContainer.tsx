import { useMemo, useState } from 'react';

import { Warning } from '@mui/icons-material';
import { Autocomplete, Grid, TextField } from '@mui/material';

import type { PrinterGroup } from '@wcp/wario-shared/types';

import { useDeletePrinterGroupMutation, usePrinterGroupById, usePrinterGroupsMap } from '@/hooks/usePrinterGroupsQuery';

import { toast } from '@/components/snackbar';
import { createNullGuard } from '@/components/wario/catalog-null-guard';

import { ToggleBooleanPropertyComponent } from '../../property-components/ToggleBooleanPropertyComponent';
import { ElementActionComponent } from '../element.action.component';

export interface PrinterGroupDeleteProps {
  printerGroupId: string;
  onCloseCallback: VoidFunction;
}

// Create null guard at module level to follow Rules of Hooks
const PrinterGroupNullGuard = createNullGuard(usePrinterGroupById);

const PrinterGroupDeleteContainer = ({ printerGroupId, onCloseCallback }: PrinterGroupDeleteProps) => {
  return (
    <PrinterGroupNullGuard
      id={printerGroupId}
      child={(printerGroup) => (
        <PrinterGroupDeleteContainerInner printerGroup={printerGroup} onCloseCallback={onCloseCallback} />
      )}
    />
  );
};

const PrinterGroupDeleteContainerInner = ({
  printerGroup,
  onCloseCallback,
}: {
  printerGroup: PrinterGroup;
  onCloseCallback: () => void;
}) => {
  const printerGroups = usePrinterGroupsMap();
  const deleteMutation = useDeletePrinterGroupMutation();

  const [reassign, setReassign] = useState(true);
  const [destinationPrinterGroup, setDestinationPrinterGroup] = useState<string | null>(null);

  const disableConfirmOn = useMemo(
    () =>
      deleteMutation.isPending ||
      (reassign && destinationPrinterGroup === null) ||
      (!reassign && destinationPrinterGroup !== null) ||
      destinationPrinterGroup === printerGroup.id,
    [printerGroup.id, deleteMutation.isPending, destinationPrinterGroup, reassign],
  );

  const handleSetReassign = (value: boolean) => {
    if (value) {
      setReassign(true);
    } else {
      setDestinationPrinterGroup(null);
      setReassign(false);
    }
  };

  const deletePrinterGroup = () => {
    deleteMutation.mutate(
      {
        id: printerGroup.id,
        reassign,
        printerGroup: reassign ? destinationPrinterGroup : null,
      },
      {
        onSuccess: () => {
          toast.success(`Deleted printer group: ${printerGroup.name}.`);
        },
        onError: (error) => {
          toast.error(`Unable to delete category: ${printerGroup.name}. Got error ${JSON.stringify(error, null, 2)}`);
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={deletePrinterGroup}
      isProcessing={deleteMutation.isPending}
      disableConfirmOn={disableConfirmOn}
      confirmText="Confirm"
      body={
        <>
          <Grid size={12}>
            <Warning /> Are you sure you'd like to delete {printerGroup.name}? Note this cannot be undone.
          </Grid>
          <Grid size={4}>
            <ToggleBooleanPropertyComponent
              disabled={deleteMutation.isPending}
              label="Reassign"
              value={reassign}
              setValue={handleSetReassign}
              labelPlacement="end"
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              filterSelectedOptions
              disabled={deleteMutation.isPending || !reassign}
              options={Object.keys(printerGroups).filter((p) => p !== printerGroup.id)}
              value={destinationPrinterGroup}
              onChange={(_, v) => {
                setDestinationPrinterGroup(v);
              }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(pgId) => printerGroups[pgId]?.name ?? 'Undefined'}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Printer Group" />}
            />
          </Grid>
        </>
      }
    />
  );
};

export default PrinterGroupDeleteContainer;
