import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { type IWSettings } from "@wcp/wario-shared";
import { useSettingsQuery } from "@wcp/wario-ux-shared/query";

import { HOST_API } from "@/config";

import { KeyValuesContainer, type KeyValuesRowType } from "./keyvalues.container";


export const StoreSettingsComponent = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: settings } = useSettingsQuery();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const onSubmit = async (values: KeyValuesRowType<string | number | boolean>[]) => {
    if (!isProcessing && settings) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order_config" } });
        const body: IWSettings = {
          ...settings,
          config: values.reduce((acc: Record<string, string | number | boolean>, x) => ({ ...acc, [x.key]: x.value }), {})
        }
        const response = await fetch(`${HOST_API}/api/v1/config/settings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body)
        });
        if (response.status === 201) {
          enqueueSnackbar(`Updated public facing Key Value Store.`)
          await response.json()
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to update public facing Key Value Store. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        setIsProcessing(false);
      }
    }
  };

  return settings && <KeyValuesContainer
    canAdd
    canEdit
    canRemove
    isProcessing={isProcessing}
    onSubmit={(values) => void onSubmit(values)}
    title={"Customer Facing Store Configuration"}
    values={Object.entries(settings.config).map(([key, value]) => ({ key, value }))}
  />;
};
