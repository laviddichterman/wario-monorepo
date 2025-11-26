import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IMoney, IOption, IRecurringInterval, KeyValue } from "@wcp/wario-shared";
import { CURRENCY, type IWInterval } from "@wcp/wario-shared";
import { getModifierTypeEntryById } from "@wcp/wario-ux-shared/redux";

import { useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from "@/config";

import { ModifierOptionComponent } from "./modifier_option.component";

export interface ModifierOptionUiContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
}

const ModifierOptionAddContainer = ({ modifierTypeId, onCloseCallback }: ModifierOptionUiContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifierType = useAppSelector(s => getModifierTypeEntryById(s.ws.modifierEntries, modifierTypeId).modifierType);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [ordinal, setOrdinal] = useState(0);
  const [price, setPrice] = useState<IMoney>({ amount: 0, currency: CURRENCY.USD });
  const [externalIds, setExternalIds] = useState<KeyValue[]>([]);
  const [enableFunction, setEnableFunction] = useState<string | null>(null);
  const [flavorFactor, setFlavorFactor] = useState(0);
  const [bakeFactor, setBakeFactor] = useState(0);
  const [canSplit, setCanSplit] = useState(false);
  const [allowHeavy, setAllowHeavy] = useState(false);
  const [allowLite, setAllowLite] = useState(false);
  const [allowOTS, setAllowOTS] = useState(false);
  const [omitFromShortname, setOmitFromShortname] = useState(false);
  const [omitFromName, setOmitFromName] = useState(false);
  const [availability, setAvailability] = useState<IRecurringInterval[]>([]);
  const [disabled, setDisabled] = useState<IWInterval | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const addModifierOption = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IOption, "id" | 'modifierTypeId'> = {
          displayName,
          description,
          shortcode,
          disabled,
          availability,
          price,
          ordinal,
          enable: enableFunction,
          externalIDs: externalIds,
          metadata: {
            flavor_factor: flavorFactor,
            bake_factor: bakeFactor,
            can_split: canSplit,
            allowHeavy,
            allowLite,
            allowOTS
          },
          displayFlags: {
            omit_from_shortname: omitFromShortname,
            omit_from_name: omitFromName
          }
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifierTypeId}/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added modifier option: ${displayName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add modifier option: ${displayName}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ModifierOptionComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addModifierOption()}
      isProcessing={isProcessing}
      modifierType={modifierType}
      displayName={displayName}
      setDisplayName={setDisplayName}
      description={description}
      setDescription={setDescription}
      shortcode={shortcode}
      setShortcode={setShortcode}
      ordinal={ordinal}
      setOrdinal={setOrdinal}
      price={price}
      setPrice={setPrice}
      externalIds={externalIds}
      setExternalIds={setExternalIds}
      enableFunction={enableFunction}
      setEnableFunction={setEnableFunction}
      flavorFactor={flavorFactor}
      setFlavorFactor={setFlavorFactor}
      bakeFactor={bakeFactor}
      setBakeFactor={setBakeFactor}
      canSplit={canSplit}
      setCanSplit={setCanSplit}
      allowHeavy={allowHeavy}
      setAllowHeavy={setAllowHeavy}
      allowLite={allowLite}
      setAllowLite={setAllowLite}
      allowOTS={allowOTS}
      setAllowOTS={setAllowOTS}
      omitFromShortname={omitFromShortname}
      setOmitFromShortname={setOmitFromShortname}
      omitFromName={omitFromName}
      setOmitFromName={setOmitFromName}
      availability={availability}
      setAvailability={setAvailability}
      disabled={disabled}
      setDisabled={setDisabled}
    />
  );
};

export default ModifierOptionAddContainer;
