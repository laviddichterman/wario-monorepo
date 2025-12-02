import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { useOptionById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import ElementDeleteComponent from "../element.delete.component";

export interface ModifierOptionQuickActionProps {
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}
const ModifierOptionDeleteContainer = ({ modifier_option_id, onCloseCallback }: ModifierOptionQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_option = useOptionById(modifier_option_id);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteModifierOption = async () => {
    if (!isProcessing && modifier_option) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifier_option.modifierTypeId}/${modifier_option.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted modifier option: ${modifier_option.displayName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to delete modifier option: ${modifier_option.displayName}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    modifier_option && <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteModifierOption()}
      name={modifier_option.displayName}
      isProcessing={isProcessing}
    />
  );
};

export default ModifierOptionDeleteContainer;
