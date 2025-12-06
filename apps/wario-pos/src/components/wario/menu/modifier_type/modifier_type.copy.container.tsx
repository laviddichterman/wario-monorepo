import { useAuth0 } from '@auth0/auth0-react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { ExpandMore } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Grid,
  Switch,
  Typography,
} from '@mui/material';

import type { IOption, IOptionType } from '@wcp/wario-shared';
import { useCatalogQuery, useModifierEntryById } from '@wcp/wario-ux-shared/query';

import {
  fromModifierOptionEntity,
  modifierOptionCopyCountAtom,
  modifierOptionCopyFlagFamily,
  modifierOptionExpandedFamily,
  modifierOptionFormFamily,
  type ModifierOptionFormState,
  toModifierOptionApiBody,
} from '@/atoms/forms/modifierOptionFormAtoms';
import {
  fromModifierTypeEntity,
  modifierTypeFormAtom,
  modifierTypeFormProcessingAtom,
  toModifierTypeApiBody,
} from '@/atoms/forms/modifierTypeFormAtoms';
import { HOST_API } from '@/config';

import { ModifierOptionContainer } from '../modifier_option/modifier_option.component';

import { ModifierTypeFormComponent, useModifierTypeForm } from './modifier_type.component';

export interface ModifierTypeCopyContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
}

const ModifierTypeCopyContainer = ({ modifierTypeId, onCloseCallback }: ModifierTypeCopyContainerProps) => {
  const modifierTypeEntry = useModifierEntryById(modifierTypeId);
  const { data: catalog } = useCatalogQuery();

  if (!modifierTypeEntry || !catalog?.options) {
    return null;
  }

  return (
    <ModifierTypeCopyContainerInner
      modifierTypeEntry={modifierTypeEntry}
      allOptions={catalog.options}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  modifierTypeEntry: NonNullable<ReturnType<typeof useModifierEntryById>>;
  allOptions: Record<string, IOption>;
  onCloseCallback: VoidFunction;
}

const ModifierTypeCopyContainerInner = ({ modifierTypeEntry, allOptions, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();

  // ModifierType form state (reusing Phase 1 atoms)
  const setModifierTypeForm = useSetAtom(modifierTypeFormAtom);
  const { form: modifierTypeForm, isValid: isModifierTypeValid } = useModifierTypeForm();
  const [isProcessing, setIsProcessing] = useAtom(modifierTypeFormProcessingAtom);

  // ModifierOption count for iteration
  const setCopyCount = useSetAtom(modifierOptionCopyCountAtom);
  const optionCount = modifierTypeEntry.options.length;

  // Initialize all atoms on mount
  useEffect(() => {
    setModifierTypeForm(fromModifierTypeEntity(modifierTypeEntry.modifierType));
    setCopyCount(optionCount);

    return () => {
      setModifierTypeForm(null);
      setCopyCount(0);
    };
  }, [modifierTypeEntry.modifierType, optionCount, setModifierTypeForm, setCopyCount]);

  const copyModifierTypeAndOptions = async () => {
    if (!modifierTypeForm || isProcessing) return;

    setIsProcessing(true);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

      // Collect options to copy - for now using original option data
      // In a full implementation, we'd read from the atomFamily
      const optionsToCopy = modifierTypeEntry.options.map((optionId) => {
        const option = allOptions[optionId];
        return toModifierOptionApiBody(fromModifierOptionEntity(option));
      });

      const body: ReturnType<typeof toModifierTypeApiBody> & { options: Omit<IOption, 'modifierTypeId' | 'id'>[] } = {
        ...toModifierTypeApiBody(modifierTypeForm),
        options: optionsToCopy,
      };

      const response = await fetch(`${HOST_API}/api/v1/menu/option/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 201) {
        enqueueSnackbar(`Added new modifier type: ${modifierTypeForm.name}.`);
        enqueueSnackbar(
          `Added options to ${modifierTypeForm.name}: ${optionsToCopy.map((o) => o.displayName).join(', ')}.`,
        );
        onCloseCallback();
      }
    } catch (error) {
      enqueueSnackbar(
        `Unable to add modifier type: ${modifierTypeForm.name}. Got error ${JSON.stringify(error, null, 2)}`,
        { variant: 'error' },
      );
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModifierTypeFormComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void copyModifierTypeAndOptions()}
      disableConfirm={!isModifierTypeValid}
    >
      {modifierTypeEntry.options.map((optionId, index) => (
        <ModifierOptionCopyEditor
          key={optionId}
          index={index}
          option={allOptions[optionId]}
          modifierType={modifierTypeEntry.modifierType}
          isProcessing={isProcessing}
        />
      ))}
    </ModifierTypeFormComponent>
  );
};

// =============================================================================
// MODIFIER OPTION COPY EDITOR
// =============================================================================

interface ModifierOptionCopyEditorProps {
  index: number;
  option: IOption;
  modifierType: IOptionType;
  isProcessing: boolean;
}

/**
 * Individual modifier option editor within the copy flow.
 * Uses atomFamily to manage its own state.
 */
const ModifierOptionCopyEditor = ({ index, option, modifierType, isProcessing }: ModifierOptionCopyEditorProps) => {
  const [formState, setFormState] = useAtom(modifierOptionFormFamily(index));
  const [copyFlag, setCopyFlag] = useAtom(modifierOptionCopyFlagFamily(index));
  const [expanded, setExpanded] = useAtom(modifierOptionExpandedFamily(index));
  const [availabilityIsValid, setAvailabilityIsValid] = useState(true);

  // Initialize this option's form state
  useEffect(() => {
    setFormState(fromModifierOptionEntity(option));
    return () => {
      setFormState(null);
    };
  }, [option, setFormState]);

  const displayName = formState?.displayName ?? option.displayName;

  const updateField = <K extends keyof ModifierOptionFormState>(field: K, value: ModifierOptionFormState[K]) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <Accordion
      sx={{ p: 2 }}
      expanded={expanded && copyFlag}
      onChange={(_, ex) => {
        setExpanded(ex);
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Grid container>
          <Grid size="grow">
            <Typography sx={{ ml: 4 }}>{displayName}</Typography>
          </Grid>
          <Grid size={2}>
            <FormControlLabel
              sx={{ float: 'right' }}
              control={
                <Switch
                  checked={copyFlag}
                  onChange={(e) => {
                    setCopyFlag(e.target.checked);
                  }}
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
          {formState && (
            <ModifierOptionContainer
              isProcessing={isProcessing}
              modifierType={modifierType}
              displayName={formState.displayName}
              setDisplayName={(v) => {
                updateField('displayName', v);
              }}
              description={formState.description}
              setDescription={(v) => {
                updateField('description', v);
              }}
              shortcode={formState.shortcode}
              setShortcode={(v) => {
                updateField('shortcode', v);
              }}
              ordinal={formState.ordinal}
              setOrdinal={(v) => {
                updateField('ordinal', v);
              }}
              price={formState.price}
              setPrice={(v) => {
                updateField('price', v);
              }}
              externalIds={formState.externalIds}
              setExternalIds={(v) => {
                updateField('externalIds', v);
              }}
              enableFunction={formState.enableFunction}
              setEnableFunction={(v) => {
                updateField('enableFunction', v);
              }}
              flavorFactor={formState.flavorFactor}
              setFlavorFactor={(v) => {
                updateField('flavorFactor', v);
              }}
              bakeFactor={formState.bakeFactor}
              setBakeFactor={(v) => {
                updateField('bakeFactor', v);
              }}
              canSplit={formState.canSplit}
              setCanSplit={(v) => {
                updateField('canSplit', v);
              }}
              allowHeavy={formState.allowHeavy}
              setAllowHeavy={(v) => {
                updateField('allowHeavy', v);
              }}
              allowLite={formState.allowLite}
              setAllowLite={(v) => {
                updateField('allowLite', v);
              }}
              allowOTS={formState.allowOTS}
              setAllowOTS={(v) => {
                updateField('allowOTS', v);
              }}
              omitFromShortname={formState.omitFromShortname}
              setOmitFromShortname={(v) => {
                updateField('omitFromShortname', v);
              }}
              omitFromName={formState.omitFromName}
              setOmitFromName={(v) => {
                updateField('omitFromName', v);
              }}
              availability={formState.availability}
              setAvailability={(v) => {
                updateField('availability', v);
              }}
              disabled={formState.disabled}
              setDisabled={(v) => {
                updateField('disabled', v);
              }}
              availabilityIsValid={availabilityIsValid}
              setAvailabilityIsValid={setAvailabilityIsValid}
            />
          )}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default ModifierTypeCopyContainer;
