import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IOption, IOptionType, KeyValue } from "@wcp/wario-shared";
import { DISPLAY_AS, MODIFIER_CLASS } from "@wcp/wario-shared";

import { HOST_API } from "@/config";

import ModifierTypeComponent from "./modifier_type.component";
import type { ModifierTypeUiProps } from "./modifier_type.component";

const ModifierTypeAddContainer = ({ onCloseCallback }: ModifierTypeUiProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [ordinal, setOrdinal] = useState(0);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [minSelected, setMinSelected] = useState(0);
  const [externalIds, setExternalIds] = useState<KeyValue[]>([]);
  const [maxSelected, setMaxSelected] = useState<number | null>(null);
  const [omitOptionIfNotAvailable, setOmitOptionIfNotAvailable] = useState(false);
  const [omitSectionIfNoAvailableOptions, setOmitSectionIfNoAvailableOptions] = useState(true);
  const [useToggleIfOnlyTwoOptions, setUseToggleIfOnlyTwoOptions] = useState(false);
  const [isHiddenDuringCustomization, setIsHiddenDuringCustomization] = useState(false);
  const [emptyDisplayAs, setEmptyDisplayAs] = useState<DISPLAY_AS>(DISPLAY_AS.OMIT);
  const [modifierClass, setModifierClass] = useState<MODIFIER_CLASS>(MODIFIER_CLASS.ADD);
  const [templateString, setTemplateString] = useState("");
  const [multipleItemSeparator, setMultipleItemSeparator] = useState(" + ");
  const [nonEmptyGroupPrefix, setNonEmptyGroupPrefix] = useState("");
  const [nonEmptyGroupSuffix, setNonEmptyGroupSuffix] = useState("");
  const [is3p, setIs3p] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const addModifierType = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IOptionType, "id"> & { options: Omit<IOption, 'modifierTypeId' | 'id'>[]; } = {
          name,
          displayName,
          ordinal,
          min_selected: minSelected,
          max_selected: maxSelected || null,
          externalIDs: externalIds,
          displayFlags: {
            omit_options_if_not_available: omitOptionIfNotAvailable,
            omit_section_if_no_available_options: omitSectionIfNoAvailableOptions,
            use_toggle_if_only_two_options: (useToggleIfOnlyTwoOptions && minSelected === 1 && maxSelected === 1),
            hidden: isHiddenDuringCustomization,
            empty_display_as: emptyDisplayAs,
            modifier_class: modifierClass,
            template_string: templateString || "",
            multiple_item_separator: multipleItemSeparator || "",
            non_empty_group_prefix: nonEmptyGroupPrefix || "",
            non_empty_group_suffix: nonEmptyGroupSuffix || "",
            is3p
          },
          options: []
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/option/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added new modifier type: ${name}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add modifier type: ${name}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ModifierTypeComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addModifierType()}
      disableConfirm={false}
      isProcessing={isProcessing}
      ordinal={ordinal}
      setOrdinal={setOrdinal}
      name={name}
      setName={setName}
      displayName={displayName}
      setDisplayName={setDisplayName}
      externalIds={externalIds}
      setExternalIds={setExternalIds}
      minSelected={minSelected}
      setMinSelected={setMinSelected}
      maxSelected={maxSelected}
      setMaxSelected={setMaxSelected}
      templateString={templateString}
      setTemplateString={setTemplateString}
      multipleItemSeparator={multipleItemSeparator}
      setMultipleItemSeparator={setMultipleItemSeparator}
      nonEmptyGroupPrefix={nonEmptyGroupPrefix}
      setNonEmptyGroupPrefix={setNonEmptyGroupPrefix}
      nonEmptyGroupSuffix={nonEmptyGroupSuffix}
      setNonEmptyGroupSuffix={setNonEmptyGroupSuffix}
      is3p={is3p}
      setIs3p={setIs3p}
      omitOptionIfNotAvailable={omitOptionIfNotAvailable}
      setOmitOptionIfNotAvailable={setOmitOptionIfNotAvailable}
      omitSectionIfNoAvailableOptions={omitSectionIfNoAvailableOptions}
      setOmitSectionIfNoAvailableOptions={setOmitSectionIfNoAvailableOptions}
      useToggleIfOnlyTwoOptions={useToggleIfOnlyTwoOptions}
      setUseToggleIfOnlyTwoOptions={setUseToggleIfOnlyTwoOptions}
      isHiddenDuringCustomization={isHiddenDuringCustomization}
      setIsHiddenDuringCustomization={setIsHiddenDuringCustomization}
      emptyDisplayAs={emptyDisplayAs}
      setEmptyDisplayAs={setEmptyDisplayAs}
      modifierClass={modifierClass}
      setModifierClass={setModifierClass}
    />
  );
};

export default ModifierTypeAddContainer;
