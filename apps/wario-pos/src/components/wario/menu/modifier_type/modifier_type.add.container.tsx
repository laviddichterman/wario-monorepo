import { useAuth0 } from '@auth0/auth0-react';
import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IOption } from '@wcp/wario-shared';

import {
  DEFAULT_MODIFIER_TYPE_FORM,
  modifierTypeFormAtom,
  toModifierTypeApiBody,
} from '@/atoms/forms/modifierTypeFormAtoms';
import { HOST_API } from '@/config';

import { ModifierTypeFormComponent, type ModifierTypeUiProps, useModifierTypeForm } from './modifier_type.component';

const ModifierTypeAddContainer = ({ onCloseCallback }: ModifierTypeUiProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, isProcessing, setIsProcessing } = useModifierTypeForm();

  // Initialize form with defaults on mount
  useEffect(() => {
    setFormState(DEFAULT_MODIFIER_TYPE_FORM);
    return () => { setFormState(null); };
  }, [setFormState]);

  const addModifierType = async () => {
    if (!form || isProcessing) return;

    setIsProcessing(true);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body: ReturnType<typeof toModifierTypeApiBody> & { options: Omit<IOption, 'modifierTypeId' | 'id'>[] } = {
        ...toModifierTypeApiBody(form),
        options: [],
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
        enqueueSnackbar(`Added new modifier type: ${form.name}.`);
        onCloseCallback();
      }
    } catch (error) {
      enqueueSnackbar(`Unable to add modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`, {
        variant: 'error',
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModifierTypeFormComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addModifierType()}
    />
  );
};

export default ModifierTypeAddContainer;
