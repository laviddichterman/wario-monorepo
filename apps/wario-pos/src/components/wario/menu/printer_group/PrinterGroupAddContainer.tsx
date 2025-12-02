import { useSnackbar } from "notistack";
import { useState } from "react";

import type { KeyValue } from "@wcp/wario-shared";

import { useAddPrinterGroupMutation } from '@/hooks/usePrinterGroupsQuery';

import PrinterGroupComponent from "./PrinterGroupComponent";

export interface PrinterGroupAddContainerProps {
  onCloseCallback: VoidFunction;
}

const PrinterGroupAddContainer = ({ onCloseCallback }: PrinterGroupAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const addMutation = useAddPrinterGroupMutation();

  const [name, setName] = useState("");
  const [singleItemPerTicket, setSingleItemPerTicket] = useState(false);
  const [isExpo, setIsExpo] = useState(false);
  const [externalIds, setExternalIds] = useState<KeyValue[]>([]);

  const addPrinterGroup = () => {
    addMutation.mutate(
      {
        name,
        isExpo,
        singleItemPerTicket
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Added new printer group: ${name}.`);
          onCloseCallback();
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to add printer group: ${name}. Got error: ${JSON.stringify(error, null, 2)}.`,
            { variant: "error" }
          );
          console.error(error);
        },
      }
    );
  };

  return (
    <PrinterGroupComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addPrinterGroup}
      isProcessing={addMutation.isPending}
      name={name}
      setName={setName}
      isExpo={isExpo}
      setIsExpo={setIsExpo}
      singleItemPerTicket={singleItemPerTicket}
      setSingleItemPerTicket={setSingleItemPerTicket}
      externalIds={externalIds}
      setExternalIds={setExternalIds}
    />
  );
};

export default PrinterGroupAddContainer;

