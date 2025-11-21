import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { KeyValue, PrinterGroup } from "@wcp/wario-shared";

import { useAppDispatch } from "@/hooks/useRedux";

import { HOST_API } from "@/config";
import { queryPrinterGroups } from '@/redux/slices/PrinterGroupSlice';

import PrinterGroupComponent from "./PrinterGroupComponent";

export interface PrinterGroupAddContainerProps {
  onCloseCallback: VoidFunction;
}

const PrinterGroupAddContainer = ({ onCloseCallback }: PrinterGroupAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [singleItemPerTicket, setSingleItemPerTicket] = useState(false);
  const [isExpo, setIsExpo] = useState(false);
  const [externalIds, setExternalIds] = useState<KeyValue[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const addPrinterGroup = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<PrinterGroup, "id"> = {
          name,
          externalIDs: externalIds,
          isExpo,
          singleItemPerTicket
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/printergroup`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added new printer group: ${name}.`);
          void dispatch(queryPrinterGroups(token));
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add printer group: ${name}. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <PrinterGroupComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addPrinterGroup()}
      isProcessing={isProcessing}
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
