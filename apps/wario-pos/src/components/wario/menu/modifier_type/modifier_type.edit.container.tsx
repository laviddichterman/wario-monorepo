import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IOptionType } from "@wcp/wario-shared";
import { useValueFromModifierEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import ModifierTypeComponent from "./modifier_type.component";
import type { ModifierTypeModifyUiProps } from "./modifier_type.component";

const ModifierTypeEditContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  const modifier_type = useValueFromModifierEntryById(modifier_type_id, "modifierType");
  if (!modifier_type) {
    return null;
  }
  return <ModifierTypeEditContainerInner onCloseCallback={onCloseCallback} modifier_type={modifier_type} />;
};

interface InnerProps { onCloseCallback: VoidFunction, modifier_type: IOptionType }
const ModifierTypeEditContainerInner = ({ onCloseCallback, modifier_type }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [ordinal, setOrdinal] = useState(modifier_type.ordinal);
  const [name, setName] = useState(modifier_type.name);
  const [displayName, setDisplayName] = useState(modifier_type.displayName);
  const [externalIds, setExternalIds] = useState(modifier_type.externalIDs);
  const [minSelected, setMinSelected] = useState(modifier_type.min_selected || 0);
  const [maxSelected, setMaxSelected] = useState(modifier_type.max_selected || null);
  const [omitOptionIfNotAvailable, setOmitOptionIfNotAvailable] = useState(modifier_type.displayFlags.omit_options_if_not_available);
  const [omitSectionIfNoAvailableOptions, setOmitSectionIfNoAvailableOptions] = useState(modifier_type.displayFlags.omit_section_if_no_available_options);
  const [useToggleIfOnlyTwoOptions, setUseToggleIfOnlyTwoOptions] = useState(modifier_type.displayFlags.use_toggle_if_only_two_options);
  const [isHiddenDuringCustomization, setIsHiddenDuringCustomization] = useState(modifier_type.displayFlags.hidden);
  const [modifierClass, setModifierClass] = useState(modifier_type.displayFlags.modifier_class);
  const [emptyDisplayAs, setEmptyDisplayAs] = useState(modifier_type.displayFlags.empty_display_as);
  const [templateString, setTemplateString] = useState(modifier_type.displayFlags.template_string);
  const [multipleItemSeparator, setMultipleItemSeparator] = useState(modifier_type.displayFlags.multiple_item_separator);
  const [nonEmptyGroupPrefix, setNonEmptyGroupPrefix] = useState(modifier_type.displayFlags.non_empty_group_prefix);
  const [nonEmptyGroupSuffix, setNonEmptyGroupSuffix] = useState(modifier_type.displayFlags.non_empty_group_suffix);
  const [is3p, setIs3p] = useState(modifier_type.displayFlags.is3p);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const editModifierType = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<IOptionType, "id"> = {
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
            empty_display_as: emptyDisplayAs,
            hidden: isHiddenDuringCustomization,
            modifier_class: modifierClass,
            template_string: templateString || "",
            multiple_item_separator: multipleItemSeparator || "",
            non_empty_group_prefix: nonEmptyGroupPrefix || "",
            non_empty_group_suffix: nonEmptyGroupSuffix || "",
            is3p
          }
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifier_type.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Updated modifier type: ${name}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to edit modifier type: ${name}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ModifierTypeComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editModifierType()}
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
    />
  );
};

export default ModifierTypeEditContainer;
