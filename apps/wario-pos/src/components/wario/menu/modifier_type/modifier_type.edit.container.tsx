import { useAuth0 } from '@auth0/auth0-react';
import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IOptionType } from '@wcp/wario-shared';
import { useValueFromModifierEntryById } from '@wcp/wario-ux-shared/query';

import {
  fromModifierTypeEntity,
  modifierTypeFormAtom,
  toModifierTypeApiBody,
} from '@/atoms/forms/modifierTypeFormAtoms';
import { HOST_API } from '@/config';

import {
  ModifierTypeFormComponent,
  type ModifierTypeModifyUiProps,
  useModifierTypeForm,
} from './modifier_type.component';

const ModifierTypeEditContainer = ({ modifier_type_id, onCloseCallback }: ModifierTypeModifyUiProps) => {
  const modifier_type = useValueFromModifierEntryById(modifier_type_id, 'modifierType');
  if (!modifier_type) {
    return null;
  }
  return <ModifierTypeEditContainerInner onCloseCallback={onCloseCallback} modifier_type={modifier_type} />;
};

interface InnerProps {
  onCloseCallback: VoidFunction;
  modifier_type: IOptionType;
}

const ModifierTypeEditContainerInner = ({ onCloseCallback, modifier_type }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();

  const setFormState = useSetAtom(modifierTypeFormAtom);
  const { form, isProcessing, setIsProcessing } = useModifierTypeForm();

  // Initialize form from existing entity
  useEffect(() => {
    setFormState(fromModifierTypeEntity(modifier_type));
    return () => { setFormState(null); };
  }, [modifier_type, setFormState]);

  const editModifierType = async () => {
    if (!form || isProcessing) return;

    setIsProcessing(true);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toModifierTypeApiBody(form);

      const response = await fetch(`${HOST_API}/api/v1/menu/option/${modifier_type.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 200) {
        enqueueSnackbar(`Updated modifier type: ${form.name}.`);
        onCloseCallback();
      }
    } catch (error) {
      enqueueSnackbar(`Unable to edit modifier type: ${form.name}. Got error ${JSON.stringify(error, null, 2)}`, {
        variant: 'error',
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModifierTypeFormComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editModifierType()}
    />
  );
};

export default ModifierTypeEditContainer;
