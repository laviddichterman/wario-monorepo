import { useStore } from 'jotai';
import { useSetAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { ArrowBack } from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Button, IconButton, Tab, Typography } from '@mui/material';

import type { IOptionType } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCatalogSelectors, useModifierTypeById } from '@wcp/wario-ux-shared/query';

import { useEditModifierTypeMutation } from '@/hooks/useModifierTypeMutations';

import { toast } from '@/components/snackbar';
import { createNullGuard } from '@/components/wario/catalog-null-guard';

import {
  DEFAULT_MODIFIER_OPTION_FORM,
  fromModifierOptionEntity,
  modifierOptionFormFamily,
} from '@/atoms/forms/modifierOptionFormAtoms';
import { fromModifierTypeEntity, modifierTypeFormAtom, useModifierTypeForm } from '@/atoms/forms/modifierTypeFormAtoms';

import { ModifierOptionFormBody } from '../modifier_option/modifier_option.component';
import { UnifiedModifierOptionTable } from '../modifier_option/unified_modifier_option_table';

import { ModifierTypeFormBody, type ModifierTypeModifyUiProps } from './modifier_type.component';

const useModifierTypeByIdNullable = (id: string | null) => {
  return useModifierTypeById(id ?? '');
};

// Create null guard at module level to follow Rules of Hooks
const ModifierTypeNullGuard = createNullGuard(useModifierTypeByIdNullable);

const ModifierTypeEditContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  return (
    <ModifierTypeNullGuard
      id={modifier_type_id}
      child={(modifier_type) => (
        <ModifierTypeEditContainerInner onCloseCallback={onCloseCallback} modifier_type={modifier_type} />
      )}
    />
  );
};

interface InnerProps {
  onCloseCallback: VoidFunction;
  modifier_type: IOptionType;
}

const ModifierTypeEditContainerInner = ({ onCloseCallback, modifier_type }: InnerProps) => {
  const catalogSelectors = useCatalogSelectors();
  const store = useStore();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, setIsProcessing, isProcessing, dirtyFields, clearDirtyFields } = useModifierTypeForm();

  const editMutation = useEditModifierTypeMutation();
  const [activeTab, setActiveTab] = useState('rules');

  // Local state for options list - IOptionType.options is now string[]
  const [optionIds, setOptionIds] = useState<string[]>([]);
  // Drill-down state
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  // Derived atom for drill-down view - calculated at top level to avoid conditional hook
  // We use useMemo to ensure stable reference if needed, though atomFamily returns stable atoms per ID.
  const editingOptionAtom = useMemo(
    () => (editingOptionId ? modifierOptionFormFamily(editingOptionId) : null),
    [editingOptionId],
  );

  // Initialize form from existing entity
  useEffect(() => {
    // 1. Type Form
    setFormState(fromModifierTypeEntity(modifier_type));
    // Clear dirty fields when loading entity for editing
    clearDirtyFields();

    // 2. Option List & Atoms - IOptionType.options is string[]
    setOptionIds(modifier_type.options);

    modifier_type.options.forEach((id: string) => {
      const ent = catalogSelectors?.option(id);
      if (ent) {
        store.set(modifierOptionFormFamily(id), fromModifierOptionEntity(ent));
      }
    });

    return () => {
      setFormState(null);
      clearDirtyFields();
      // Cleanup option atoms
      modifier_type.options.forEach((id: string) => {
        modifierOptionFormFamily.remove(id);
      });
    };
  }, [modifier_type, setFormState, catalogSelectors, store, clearDirtyFields]);

  const editModifierType = () => {
    if (!form || editMutation.isPending) return;

    // TODO: Implement Batch Update for Options (Scope Limitation: UX Only for now)

    setIsProcessing(true);
    editMutation.mutate(
      { id: modifier_type.id, form, dirtyFields },
      {
        onSuccess: () => {
          toast.success(`Updated modifier type: ${form.name}.`);
        },
        onError: (error) => {
          toast.error(`Unable to edit modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`);
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
          {/* FormAtom is passed directly now, derived at top level */}
          <ModifierOptionFormBody modifierType={modifier_type} formAtom={editingOptionAtom} />
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

  // Main View
  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title={`Edit ${form.name}`}>
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
          {/* Main type form uses global atom, so it renders regardless of tab (logic inside handles hiding) */}
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
          <Button onClick={editModifierType} disabled={isProcessing || dirtyFields.size === 0} variant="contained">
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ModifierTypeEditContainer;
