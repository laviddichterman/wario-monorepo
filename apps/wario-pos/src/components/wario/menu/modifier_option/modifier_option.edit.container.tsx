import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCatalogSelectors, useModifierTypeById, useOptionById } from '@wcp/wario-ux-shared/query';

import { useEditModifierOptionMutation } from '@/hooks/useModifierOptionMutations';

import { toast } from '@/components/snackbar';

import {
  fromModifierOptionEntity,
  modifierOptionFormAtom,
  modifierOptionFormDirtyFieldsAtom,
  modifierOptionFormProcessingAtom,
} from '@/atoms/forms/modifierOptionFormAtoms';

import { ModifierOptionFormBody } from './modifier_option.component';

export interface ModifierOptionEditContainerProps {
  modifier_type_id: string;
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}

export const ModifierOptionEditContainer = ({
  modifier_type_id,
  modifier_option_id,
  onCloseCallback,
}: ModifierOptionEditContainerProps) => {
  const catalogSelectors = useCatalogSelectors();
  const setForm = useSetAtom(modifierOptionFormAtom);
  const setDirtyFields = useSetAtom(modifierOptionFormDirtyFieldsAtom);

  useEffect(() => {
    if (catalogSelectors) {
      const ent = catalogSelectors.option(modifier_option_id);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (ent) {
        setForm(fromModifierOptionEntity(ent));
        // Clear dirty fields when loading a new entity for editing
        setDirtyFields(new Set());
      }
    }
    return () => {
      setForm(null);
      setDirtyFields(new Set());
    };
  }, [catalogSelectors, modifier_option_id, setForm, setDirtyFields]);

  if (!catalogSelectors) return null;

  return (
    <ModifierOptionEditForm
      modifier_type_id={modifier_type_id}
      modifier_option_id={modifier_option_id}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface ModifierOptionEditFormProps {
  modifier_type_id: string;
  modifier_option_id: string;
  onCloseCallback: VoidFunction;
}

const ModifierOptionEditForm = ({
  modifier_type_id,
  modifier_option_id,
  onCloseCallback,
}: ModifierOptionEditFormProps) => {
  // const { enqueueSnackbar } = useSnackbar();
  const modifierType = useModifierTypeById(modifier_type_id);
  const modifierOption = useOptionById(modifier_option_id);
  const [activeTab, setActiveTab] = useState('identity');

  const [form] = useAtom(modifierOptionFormAtom);
  const dirtyFields = useAtomValue(modifierOptionFormDirtyFieldsAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierOptionFormProcessingAtom);

  const editMutation = useEditModifierOptionMutation();

  const save = () => {
    if (!form) return;
    setIsProcessing(true);

    editMutation.mutate(
      { modifierTypeId: modifier_type_id, optionId: modifier_option_id, form, dirtyFields },
      {
        onSuccess: () => {
          toast.success('Saved modifier option');
          onCloseCallback();
        },
        onError: (e) => {
          console.error(e);
          toast.error('Failed to save modifier option');
        },
        onSettled: () => {
          setIsProcessing(false);
        },
      },
    );
  };

  if (!modifierOption || !modifierType) return null;

  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title="Edit Modifier Option">
          <TabList
            onChange={(_e, v: string) => {
              setActiveTab(v);
            }}
            aria-label="Modifier option tabs"
          >
            <Tab label="Identity" value="identity" />
            <Tab label="Rules" value="rules" />
            <Tab label="Configuration" value="config" />
            <Tab label="Availability" value="availability" />
          </TabList>
        </AppDialog.Header>
        <AppDialog.Content>
          <ModifierOptionFormBody modifierType={modifierType} />
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={onCloseCallback} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              save();
            }}
            disabled={isProcessing || dirtyFields.size === 0}
            variant="contained"
          >
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ModifierOptionEditContainer;
