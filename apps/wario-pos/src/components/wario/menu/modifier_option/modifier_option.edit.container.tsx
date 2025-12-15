import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCatalogSelectors, useModifierTypeById, useOptionById } from '@wcp/wario-ux-shared/query';

import {
  fromModifierOptionEntity,
  modifierOptionFormAtom,
  modifierOptionFormDirtyFieldsAtom,
  modifierOptionFormProcessingAtom,
  toModifierOptionApiBody,
} from '@/atoms/forms/modifierOptionFormAtoms';
import { HOST_API } from '@/config';

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
  const { enqueueSnackbar } = useSnackbar();
  const modifierType = useModifierTypeById(modifier_type_id);
  const modifierOption = useOptionById(modifier_option_id);
  const [activeTab, setActiveTab] = useState('identity');

  const [form] = useAtom(modifierOptionFormAtom);
  const dirtyFields = useAtomValue(modifierOptionFormDirtyFieldsAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierOptionFormProcessingAtom);

  const save = async () => {
    if (!form) return;
    setIsProcessing(true);
    try {
      // Only send dirty fields for PATCH/update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = toModifierOptionApiBody(form, dirtyFields);

      const response = await fetch(`${HOST_API}/api/v1/menu/modifier_option/${modifier_option_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 200) {
        enqueueSnackbar('Saved modifier option ');
        onCloseCallback();
      } else {
        enqueueSnackbar('Failed to save modifier option', { variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Failed to save modifier option', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
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
          <Button onClick={() => void save()} disabled={isProcessing} variant="contained">
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};

export default ModifierOptionEditContainer;
