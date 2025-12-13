import { useAtom, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useModifierTypeById } from '@wcp/wario-ux-shared/query';

import {
  DEFAULT_MODIFIER_OPTION_FORM,
  modifierOptionFormAtom,
  modifierOptionFormProcessingAtom,
  toModifierOptionApiBody,
} from '@/atoms/forms/modifierOptionFormAtoms';
import { HOST_API } from '@/config';

import { ModifierOptionFormBody } from './modifier_option.component';

export interface ModifierOptionAddContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
}

export const ModifierOptionAddContainer = ({ modifierTypeId, onCloseCallback }: ModifierOptionAddContainerProps) => {
  const modifierType = useModifierTypeById(modifierTypeId);
  const setForm = useSetAtom(modifierOptionFormAtom);
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState('identity');

  const [form] = useAtom(modifierOptionFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierOptionFormProcessingAtom);

  useEffect(() => {
    setForm(DEFAULT_MODIFIER_OPTION_FORM);
    return () => {
      setForm(null);
    };
  }, [setForm]);

  const save = async () => {
    if (!form) return;
    setIsProcessing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        ...toModifierOptionApiBody(form),
        modifierTypeId,
      };

      const response = await fetch(`${HOST_API}/api/v1/menu/modifier_option`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 201) {
        enqueueSnackbar('Created modifier option');
        onCloseCallback();
      } else {
        enqueueSnackbar('Failed to create modifier option', { variant: 'error' });
      }
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Failed to create modifier option', { variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!modifierType) return null;

  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title="Add Modifier Option">
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
