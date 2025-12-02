import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useCallback, useState } from "react";

import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, FormControlLabel, Grid, Switch, Typography } from "@mui/material";

import type { IOption, IOptionType } from "@wcp/wario-shared";
import { useIndexedState } from "@wcp/wario-ux-shared/common";
import { useCatalogQuery, useModifierEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ModifierOptionContainer } from "../modifier_option/modifier_option.component";

import { ModifierTypeComponent } from "./modifier_type.component";

export interface ModifierTypeCopyContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
};
const ModifierTypeCopyContainer = ({ modifierTypeId, onCloseCallback }: ModifierTypeCopyContainerProps) => {
  const modifierTypeEntry = useModifierEntryById(modifierTypeId);
  const { data: catalog } = useCatalogQuery();

  if (!modifierTypeEntry || !catalog?.options) {
    return null;
  }

  return <ModifierTypeCopyContainerInner modifierTypeEntry={modifierTypeEntry} allOptions={catalog.options} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  modifierTypeEntry: NonNullable<ReturnType<typeof useModifierEntryById>>;
  allOptions: Record<string, IOption>;
  onCloseCallback: VoidFunction;
}

const ModifierTypeCopyContainerInner = ({ modifierTypeEntry, allOptions, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [ordinal, setOrdinal] = useState(modifierTypeEntry.modifierType.ordinal);
  const [name, setName] = useState(modifierTypeEntry.modifierType.name);

  const [displayName, setDisplayName] = useState(modifierTypeEntry.modifierType.displayName);
  const [externalIds, setExternalIds] = useState(modifierTypeEntry.modifierType.externalIDs);
  const [minSelected, setMinSelected] = useState(modifierTypeEntry.modifierType.min_selected || 0);
  const [maxSelected, setMaxSelected] = useState(modifierTypeEntry.modifierType.max_selected || null);
  const [omitOptionIfNotAvailable, setOmitOptionIfNotAvailable] = useState(modifierTypeEntry.modifierType.displayFlags.omit_options_if_not_available);
  const [omitSectionIfNoAvailableOptions, setOmitSectionIfNoAvailableOptions] = useState(modifierTypeEntry.modifierType.displayFlags.omit_section_if_no_available_options);
  const [useToggleIfOnlyTwoOptions, setUseToggleIfOnlyTwoOptions] = useState(modifierTypeEntry.modifierType.displayFlags.use_toggle_if_only_two_options);
  const [isHiddenDuringCustomization, setIsHiddenDuringCustomization] = useState(modifierTypeEntry.modifierType.displayFlags.hidden);
  const [modifierClass, setModifierClass] = useState(modifierTypeEntry.modifierType.displayFlags.modifier_class);
  const [emptyDisplayAs, setEmptyDisplayAs] = useState(modifierTypeEntry.modifierType.displayFlags.empty_display_as);
  const [templateString, setTemplateString] = useState(modifierTypeEntry.modifierType.displayFlags.template_string);
  const [multipleItemSeparator, setMultipleItemSeparator] = useState(modifierTypeEntry.modifierType.displayFlags.multiple_item_separator);
  const [nonEmptyGroupPrefix, setNonEmptyGroupPrefix] = useState(modifierTypeEntry.modifierType.displayFlags.non_empty_group_prefix);
  const [nonEmptyGroupSuffix, setNonEmptyGroupSuffix] = useState(modifierTypeEntry.modifierType.displayFlags.non_empty_group_suffix);
  const [is3p, setIs3p] = useState(modifierTypeEntry.modifierType.displayFlags.is3p);

  // product instance indexed state
  const [expandedPanels, setExpandedPanel] = useIndexedState(useState(Array<boolean>(modifierTypeEntry.options.length).fill(false)));
  const [copyOpFlags, setCopyOpFlag] = useIndexedState(useState(Array<boolean>(modifierTypeEntry.options.length).fill(true)));

  const [opDisplayName, setOpDisplayName] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].displayName)));
  const [opDescription, setOpDescription] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].description)));
  const [opShortcode, setOpShortcode] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].shortcode)));
  const [opOrdinal, setOpOrdinal] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].ordinal)));
  const [opPrice, setOpPrice] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].price)));
  const [opExternalIds, setOpExternalIds] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].externalIDs)));
  const [opEnableFunction, setOpEnableFunction] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].enable ?? null)));
  const [opFlavorFactor, setOpFlavorFactor] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.flavor_factor)));
  const [opBakeFactor, setOpBakeFactor] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.bake_factor)));
  const [opCanSplit, setOpCanSplit] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.can_split)));
  const [opAllowHeavy, setOpAllowHeavy] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.allowHeavy)));
  const [opAllowLite, setOpAllowLite] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.allowLite)));
  const [opAllowOTS, setOpAllowOTS] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].metadata.allowOTS)));
  const [opOmitFromShortname, setOpOmitFromShortname] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].displayFlags.omit_from_shortname)));
  const [opOmitFromName, setOpOmitFromName] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].displayFlags.omit_from_name)));
  const [opDisabled, setOpDisabled] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].disabled ?? null)));
  const [opAvailability, setOpAvailability] = useIndexedState(useState(modifierTypeEntry.options.map(oId => allOptions[oId].availability)));
  const [availabilityIsValid, setAvailabilityIsValid] = useState(true);

  // API state
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const getModifierOptionEditor = useCallback((i: number) => (
    <Accordion sx={{ p: 2 }} key={i} expanded={expandedPanels[i] && copyOpFlags[i]} onChange={(_, ex) => { setExpandedPanel(i)(ex); }}  >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container>
          <Grid size="grow">
            <Typography sx={{ ml: 4 }}>{opDisplayName[i]}</Typography>
          </Grid>
          <Grid size={2}>
            <FormControlLabel sx={{ float: "right" }} control={
              <Switch
                checked={copyOpFlags[i]}
                onChange={(e) => { setCopyOpFlag(i)(e.target.checked); }}
                name="Copy"
              />
            }
              label="Copy"
            />
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3} justifyContent="center">
          <ModifierOptionContainer
            isProcessing={isProcessing}
            availabilityIsValid={availabilityIsValid}
            setAvailabilityIsValid={setAvailabilityIsValid}
            modifierType={{
              displayName,
              min_selected: minSelected,
              max_selected: maxSelected,
              name,
              displayFlags: {
                omit_options_if_not_available: omitOptionIfNotAvailable,
                omit_section_if_no_available_options: omitSectionIfNoAvailableOptions,
                empty_display_as: emptyDisplayAs,
                hidden: isHiddenDuringCustomization,
                is3p,
                modifier_class: modifierClass,
                multiple_item_separator: multipleItemSeparator,
                non_empty_group_prefix: nonEmptyGroupPrefix,
                non_empty_group_suffix: nonEmptyGroupSuffix,
                template_string: templateString,
                use_toggle_if_only_two_options: useToggleIfOnlyTwoOptions
              },
              externalIDs: externalIds,
              ordinal
            }}
            displayName={opDisplayName[i]}
            setDisplayName={setOpDisplayName(i)}
            description={opDescription[i]}
            setDescription={setOpDescription(i)}
            shortcode={opShortcode[i]}
            setShortcode={setOpShortcode(i)}
            ordinal={opOrdinal[i]}
            setOrdinal={setOpOrdinal(i)}
            price={opPrice[i]}
            setPrice={setOpPrice(i)}
            externalIds={opExternalIds[i]}
            setExternalIds={setOpExternalIds(i)}
            enableFunction={opEnableFunction[i]}
            setEnableFunction={setOpEnableFunction(i)}
            flavorFactor={opFlavorFactor[i]}
            setFlavorFactor={setOpFlavorFactor(i)}
            bakeFactor={opBakeFactor[i]}
            setBakeFactor={setOpBakeFactor(i)}
            canSplit={opCanSplit[i]}
            setCanSplit={setOpCanSplit(i)}
            allowHeavy={opAllowHeavy[i]}
            setAllowHeavy={setOpAllowHeavy(i)}
            allowLite={opAllowLite[i]}
            setAllowLite={setOpAllowLite(i)}
            allowOTS={opAllowOTS[i]}
            setAllowOTS={setOpAllowOTS(i)}
            omitFromShortname={opOmitFromShortname[i]}
            setOmitFromShortname={setOpOmitFromShortname(i)}
            omitFromName={opOmitFromName[i]}
            setOmitFromName={setOpOmitFromName(i)}
            availability={opAvailability[i]}
            setAvailability={setOpAvailability(i)}
            disabled={opDisabled[i]}
            setDisabled={setOpDisabled(i)}
          />
        </Grid>
      </AccordionDetails>
    </Accordion>), [isProcessing, expandedPanels, copyOpFlags, displayName, emptyDisplayAs, externalIds, is3p, isHiddenDuringCustomization, maxSelected, minSelected, modifierClass, multipleItemSeparator, name, nonEmptyGroupPrefix, nonEmptyGroupSuffix, omitOptionIfNotAvailable, omitSectionIfNoAvailableOptions, opAllowHeavy, opAllowLite, opAllowOTS, opBakeFactor, opCanSplit, opDescription, opDisabled, opDisplayName, opEnableFunction, opExternalIds, opFlavorFactor, opOmitFromName, opOmitFromShortname, opOrdinal, opPrice, opShortcode, ordinal, setCopyOpFlag, setExpandedPanel, setOpAllowHeavy, setOpAllowLite, setOpAllowOTS, setOpBakeFactor, setOpCanSplit, setOpDescription, setOpDisabled, setOpDisplayName, setOpEnableFunction, setOpExternalIds, setOpFlavorFactor, setOpOmitFromName, setOpOmitFromShortname, setOpOrdinal, setOpPrice, setOpShortcode, opAvailability, setOpAvailability, templateString, useToggleIfOnlyTwoOptions, availabilityIsValid])

  const copyModifierTypeAndOptions = async () => {
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
          options: modifierTypeEntry.options.flatMap((_, i) => copyOpFlags[i] ? [{
            displayName: opDisplayName[i],
            description: opDescription[i],
            shortcode: opShortcode[i],
            availability: opAvailability[i],
            disabled: opDisabled[i],
            price: opPrice[i],
            ordinal: opOrdinal[i],
            enable: opEnableFunction[i],
            externalIDs: opExternalIds[i],
            metadata: {
              flavor_factor: opFlavorFactor[i],
              bake_factor: opBakeFactor[i],
              can_split: opCanSplit[i],
              allowHeavy: opAllowHeavy[i],
              allowLite: opAllowLite[i],
              allowOTS: opAllowOTS[i]
            },
            displayFlags: {
              omit_from_shortname: opOmitFromShortname[i],
              omit_from_name: opOmitFromName[i]
            }
          }] : [])
        };
        const modifierTypeCreateResponse = await fetch(`${HOST_API}/api/v1/menu/option/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (modifierTypeCreateResponse.status === 201) {
          enqueueSnackbar(`Added new modifier type: ${name}.`);
          enqueueSnackbar(`Added options to ${name}: ${modifierTypeEntry.options.flatMap((_, i) => copyOpFlags[i] ? [opDisplayName[i]] : []).join(', ')}.`);
          onCloseCallback();
        }
      } catch (error) {
        enqueueSnackbar(`Unable to add modifier type: ${name}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
      }
      setIsProcessing(false);
    }
  };

  return (
    <ModifierTypeComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void copyModifierTypeAndOptions()}
      isProcessing={isProcessing}
      disableConfirm={false}
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
      children={modifierTypeEntry.options.map((_, i) => getModifierOptionEditor(i)
      )}
    />
  );
};

export default ModifierTypeCopyContainer;