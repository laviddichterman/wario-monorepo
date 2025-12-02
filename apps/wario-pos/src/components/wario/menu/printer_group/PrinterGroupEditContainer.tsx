import { useSnackbar } from "notistack";
import { useState } from "react";

import { useEditPrinterGroupMutation } from '@/hooks/usePrinterGroupsQuery';

import PrinterGroupComponent from "./PrinterGroupComponent";
import type { PrinterGroupEditProps } from "./PrinterGroupComponent";

const PrinterGroupEditContainer = ({ printerGroup, onCloseCallback }: PrinterGroupEditProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const editMutation = useEditPrinterGroupMutation();

  const [name, setName] = useState(printerGroup.name);
  const [singleItemPerTicket, setSingleItemPerTicket] = useState(printerGroup.singleItemPerTicket);
  const [externalIds, setExternalIds] = useState(printerGroup.externalIDs);
  const [isExpo, setIsExpo] = useState(printerGroup.isExpo);

  const editCategory = () => {
    editMutation.mutate(
      {
        id: printerGroup.id,
        name,
        isExpo,
        singleItemPerTicket
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated printer group: ${name}.`);
          onCloseCallback();
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to update printer group: ${name}. Got error ${JSON.stringify(error, null, 2)}`,
            { variant: 'error' }
          );
          console.error(error);
        },
      }
    );
  };

  return (
    <PrinterGroupComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={editCategory}
      isProcessing={editMutation.isPending}
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

export default PrinterGroupEditContainer;

