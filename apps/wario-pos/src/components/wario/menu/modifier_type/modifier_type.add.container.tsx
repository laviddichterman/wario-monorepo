import { useSetAtom, useStore } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { ArrowBack } from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Button, IconButton, Tab, Typography } from '@mui/material';

import type { IOptionType } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useAddModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import { toast } from '@/components/snackbar';

import {
  DEFAULT_MODIFIER_OPTION_FORM,
  type ModifierOptionApiBody,
  modifierOptionFormFamily,
  toModifierOptionApiBody,
} from '@/atoms/forms/modifierOptionFormAtoms';
import {
  DEFAULT_MODIFIER_TYPE_FORM,
  modifierTypeFormAtom,
  toModifierTypeApiBody,
  useModifierTypeForm,
} from '@/atoms/forms/modifierTypeFormAtoms';

import { ModifierOptionFormBody } from '../modifier_option/modifier_option.component';
import { UnifiedModifierOptionTable } from '../modifier_option/unified_modifier_option_table';

import { ModifierTypeFormBody, type ModifierTypeUiProps } from './modifier_type.component';

const ModifierTypeAddContainer = ({ onCloseCallback }: ModifierTypeUiProps) => {
  const store = useStore();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, setIsProcessing, isProcessing } = useModifierTypeForm();

  const addMutation = useAddModifierTypeMutation();
  const [activeTab, setActiveTab] = useState('rules');

  // Options State
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  // Derived atom for drill-down view
  const editingOptionAtom = useMemo(
    () => (editingOptionId ? modifierOptionFormFamily(editingOptionId) : null),
    [editingOptionId],
  );

  // Initialize form with defaults on mount
  useEffect(() => {
    setFormState(DEFAULT_MODIFIER_TYPE_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addModifierType = () => {
    if (!form || addMutation.isPending) return;

    // Gather Options
    const optionsPayload = optionIds
      .map((id) => {
        const optForm = store.get(modifierOptionFormFamily(id));
        if (!optForm) return null;
        return toModifierOptionApiBody(optForm);
      })
      .filter((x): x is ModifierOptionApiBody => x !== null);

    setIsProcessing(true);
    addMutation.mutate(
      { form, options: optionsPayload },
      {
        onSuccess: () => {
          toast.success(`Added new modifier type: ${form.name}.`);
        },
        onError: (error) => {
          toast.error(`Unable to add modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`);
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  const handleAddOption = () => {
    const newId = `temp_${String(Date.now())}`;
    const newOption = {
      ...DEFAULT_MODIFIER_OPTION_FORM,
      ordinal: optionIds.length,
    };
    store.set(modifierOptionFormFamily(newId), newOption);
    setOptionIds((prev) => [...prev, newId]);
    setEditingOptionId(newId);
  };

  const handleEditOption = (id: string) => {
    setEditingOptionId(id);
  };

  const handleDeleteOption = (id: string) => {
    setOptionIds((prev) => prev.filter((x) => x !== id));
    modifierOptionFormFamily.remove(id);
  };

  const handleCopyOption = (id: string) => {
    const sourceForm = store.get(modifierOptionFormFamily(id));
    if (!sourceForm) return;

    const newId = `temp_${String(Date.now())}`;
    store.set(modifierOptionFormFamily(newId), { ...sourceForm, displayName: `${sourceForm.displayName} (Copy)` });
    setOptionIds((prev) => [...prev, newId]);
  };

  if (!form) return null;

  // Drill-down View
  if (editingOptionId && editingOptionAtom) {
    return (
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header
          onClose={onCloseCallback}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconButton
                onClick={() => {
                  setEditingOptionId(null);
                }}
                size="small"
                edge="start"
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6">Edit Option</Typography>
            </div>
          }
        >
          {/* Header Actions/Tabs if needed */}
        </AppDialog.Header>
        <AppDialog.Content>
          {/* Mock IOptionType for context */}
          <ModifierOptionFormBody
            modifierType={
              {
                ...toModifierTypeApiBody(form),
                id: 'TEMP_ADD',
                version: '1',
                modifier_type_options: [],
                options: [],
                deletedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as unknown as IOptionType
            }
            formAtom={editingOptionAtom}
          />
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button
            onClick={() => {
              setEditingOptionId(null);
            }}
            variant="contained"
          >
            Done
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    );
  }

  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title="Add Modifier Type">
          <TabList
            onChange={(_e, v: string) => {
              setActiveTab(v);
            }}
            aria-label="modifier type tabs"
            textColor="inherit"
          >
            <Tab label="Rules" value="rules" />
            <Tab label="Formatting" value="formatting" />
            <Tab label="Options" value="options" />
          </TabList>
        </AppDialog.Header>
        <AppDialog.Content>
          <ModifierTypeFormBody />
          <TabPanel value="options" sx={{ p: 0, pt: 2 }}>
            <UnifiedModifierOptionTable
              optionIds={optionIds}
              onAddOption={handleAddOption}
              onEditOption={handleEditOption}
              onDeleteOption={handleDeleteOption}
              onCopyOption={handleCopyOption}
            />
          </TabPanel>
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={onCloseCallback} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={addModifierType} disabled={isProcessing} variant="contained">
            Add
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ModifierTypeAddContainer;
