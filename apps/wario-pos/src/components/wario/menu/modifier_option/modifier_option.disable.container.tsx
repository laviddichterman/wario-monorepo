import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { Grid } from "@mui/material";

import type { IOption } from "@wcp/wario-shared";
import { useOptionById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ElementActionComponent } from "../element.action.component";

import type { ModifierOptionQuickActionProps } from "./modifier_option.delete.container";

const ModifierOptionDisableContainer = ({ modifier_option_id, onCloseCallback }: ModifierOptionQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_option = useOptionById(modifier_option_id) as IOption | null;
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const editModifierOption = async () => {
    if (!isProcessing && modifier_option) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: IOption = {
          ...modifier_option,
          disabled: { start: 1, end: 0 }
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifier_option.modifierTypeId}/${modifier_option.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Disabled modifier option: ${modifier_option.displayName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to update modifier option: ${modifier_option.displayName}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    modifier_option && <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editModifierOption()}
      isProcessing={isProcessing}
      disableConfirmOn={isProcessing}
      confirmText="Confirm"
      body={
        <Grid size={12}>
          Are you sure you'd like to disable {modifier_option.displayName}?
        </Grid>
      }
    />
  );
};

export default ModifierOptionDisableContainer;