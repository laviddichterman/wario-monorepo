import { useAtom, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { TabContext, TabList } from '@mui/lab';
import { Button, Tab } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useModifierTypeById } from '@wcp/wario-ux-shared/query';

import { useAddModifierOptionMutation } from '@/hooks/useModifierOptionMutations';

import { toast } from '@/components/snackbar';

import {
  DEFAULT_MODIFIER_OPTION_FORM,
  modifierOptionFormAtom,
  modifierOptionFormProcessingAtom,
} from '@/atoms/forms/modifierOptionFormAtoms';

import { ModifierOptionFormBody } from './modifier_option.component';

export interface ModifierOptionAddContainerProps {
  modifierTypeId: string;
  onCloseCallback: VoidFunction;
}

export const ModifierOptionAddContainer = ({ modifierTypeId, onCloseCallback }: ModifierOptionAddContainerProps) => {
  const modifierType = useModifierTypeById(modifierTypeId);
  const setForm = useSetAtom(modifierOptionFormAtom);

  const [activeTab, setActiveTab] = useState('identity');

  const [form] = useAtom(modifierOptionFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(modifierOptionFormProcessingAtom);

  useEffect(() => {
    setForm(DEFAULT_MODIFIER_OPTION_FORM);
    return () => {
      setForm(null);
    };
  }, [setForm]);

  const addMutation = useAddModifierOptionMutation();

  const save = () => {
    if (!form) return;
    setIsProcessing(true);

    addMutation.mutate(
      { modifierTypeId, form },
      {
        onSuccess: () => {
          toast.success('Created modifier option');
          onCloseCallback();
        },
        onError: (e) => {
          console.error(e);
          toast.error('Failed to create modifier option');
        },
        onSettled: () => {
          setIsProcessing(false);
        },
      },
    );
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
          <Button
            onClick={() => {
              save();
            }}
            disabled={isProcessing}
            variant="contained"
          >
            Save
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};
