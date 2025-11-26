import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IOption } from "@wcp/wario-shared";
import { getModifierOptionById, getModifierTypeEntryById } from "@wcp/wario-ux-shared/redux";

import { useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from "@/config";

import { ModifierOptionComponent } from "./modifier_option.component";

interface ModifierOptionEditContainerProps {
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}
const ModifierOptionEditContainer = ({ modifier_option_id, onCloseCallback }: ModifierOptionEditContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const modifier_option = useAppSelector(s => getModifierOptionById(s.ws.modifierOptions, modifier_option_id));
  const modifierTypeEntry = useAppSelector(s => getModifierTypeEntryById(s.ws.modifierEntries, getModifierOptionById(s.ws.modifierOptions, modifier_option_id).modifierTypeId));
  const [displayName, setDisplayName] = useState(modifier_option.displayName);
  const [description, setDescription] = useState(modifier_option.description);
  const [shortcode, setShortcode] = useState(modifier_option.shortcode);
  const [ordinal, setOrdinal] = useState(modifier_option.ordinal);
  const [price, setPrice] = useState(modifier_option.price);
  const [externalIds, setExternalIds] = useState(modifier_option.externalIDs);
  const [enableFunction, setEnableFunction] = useState(modifier_option.enable ?? null);
  const [flavorFactor, setFlavorFactor] = useState(modifier_option.metadata.flavor_factor);
  const [bakeFactor, setBakeFactor] = useState(modifier_option.metadata.bake_factor);
  const [canSplit, setCanSplit] = useState(modifier_option.metadata.can_split);
  const [allowHeavy, setAllowHeavy] = useState(modifier_option.metadata.allowHeavy);
  const [allowLite, setAllowLite] = useState(modifier_option.metadata.allowLite);
  const [allowOTS, setAllowOTS] = useState(modifier_option.metadata.allowOTS);
  const [omitFromShortname, setOmitFromShortname] = useState(modifier_option.displayFlags.omit_from_shortname);
  const [omitFromName, setOmitFromName] = useState(modifier_option.displayFlags.omit_from_name);
  const [disabled, setDisabled] = useState(modifier_option.disabled ?? null);
  const [availability, setAvailability] = useState(modifier_option.availability);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const editModifierOption = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IOption, "id" | "modifierTypeId"> = {
          displayName,
          description,
          shortcode,
          disabled,
          availability,
          price,
          ordinal,
          enable: enableFunction ? enableFunction : null,
          metadata: {
            flavor_factor: flavorFactor,
            bake_factor: bakeFactor,
            can_split: canSplit,
            allowHeavy,
            allowLite,
            allowOTS
          },
          externalIDs: externalIds,
          displayFlags: {
            omit_from_shortname: omitFromShortname,
            omit_from_name: omitFromName
          }
        }
        const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifier_option.modifierTypeId}/${modifier_option.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Updated modifier option: ${modifier_option.displayName}.`);
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
    <ModifierOptionComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editModifierOption()}
      isProcessing={isProcessing}
      modifierType={modifierTypeEntry.modifierType}
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

export default ModifierOptionEditContainer;