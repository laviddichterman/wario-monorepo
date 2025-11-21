import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useMemo, useState } from "react";

import { Warning } from "@mui/icons-material";
import { Autocomplete, Grid, TextField } from "@mui/material";

import { ReduceArrayToMapByKey } from "@wcp/wario-shared";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from "@/config";
import { getPrinterGroups, queryPrinterGroups } from '@/redux/slices/PrinterGroupSlice';

import { ToggleBooleanPropertyComponent } from "../../property-components/ToggleBooleanPropertyComponent";
import { ElementActionComponent } from "../element.action.component";

import type { PrinterGroupEditProps } from "./PrinterGroupComponent";


const PrinterGroupDeleteContainer = ({ printerGroup, onCloseCallback }: PrinterGroupEditProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const printerGroups = useAppSelector(s => ReduceArrayToMapByKey(getPrinterGroups(s.printerGroup.printerGroups), 'id'));
  const [reassign, setReassign] = useState(true);
  const [destinationPrinterGroup, setDestinationPrinterGroup] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const disableConfirmOn = useMemo(() => isProcessing || (reassign && destinationPrinterGroup === null) || (!reassign && destinationPrinterGroup !== null) || destinationPrinterGroup === printerGroup.id, [printerGroup.id, isProcessing, destinationPrinterGroup, reassign])
  const { getAccessTokenSilently } = useAuth0();
  const handleSetReassign = (value: boolean) => {
    if (value) {
      setReassign(true);
    } else {
      setDestinationPrinterGroup(null);
      setReassign(false)
    }
  }

  const deletePrinterGroup = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      const reqBody = {
        reassign,
        printerGroup: reassign ? destinationPrinterGroup : null
      };
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog write:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/menu/printergroup/${printerGroup.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reqBody)
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted printer group: ${printerGroup.name}.`);
          void dispatch(queryPrinterGroups(token));
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to delete category: ${printerGroup.name}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };


  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deletePrinterGroup()}
      isProcessing={isProcessing}
      disableConfirmOn={disableConfirmOn}
      confirmText="Confirm"
      body={
        <>
          <Grid size={12}>
            <Warning /> Are you sure you'd like to delete {printerGroup.name}? Note this cannot be undone.
          </Grid>
          <Grid size={4}>
            <ToggleBooleanPropertyComponent
              disabled={isProcessing}
              label="Reassign"
              value={reassign}
              setValue={handleSetReassign}
              labelPlacement='end'
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              filterSelectedOptions
              disabled={isProcessing || !reassign}
              options={Object.keys(printerGroups).filter(p => p !== printerGroup.id)}
              value={destinationPrinterGroup}
              onChange={(e, v) => { setDestinationPrinterGroup(v); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(pgId) => printerGroups[pgId].name ?? "Undefined"}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Printer Group" />}
            />
          </Grid>
        </>

      } />
  );
};

export default PrinterGroupDeleteContainer;
