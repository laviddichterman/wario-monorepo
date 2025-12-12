import { useAtomValue, useSetAtom } from 'jotai';

import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import { useModifierTypeById } from '@wcp/wario-ux-shared/query';

import { createNullGuard } from '@/components/wario/catalog-null-guard';

import {
  closeDialogueAtom,
  dialogueStateAtom,
  selectedModifierOptionIdAtom,
  selectedModifierTypeIdAtom,
} from '@/atoms/catalog';

import { ModifierOptionAddContainer } from './modifier_option/modifier_option.add.container';
import ModifierOptionDeleteContainer from './modifier_option/modifier_option.delete.container';
import ModifierOptionDisableContainer from './modifier_option/modifier_option.disable.container';
import ModifierOptionDisableUntilEodContainer from './modifier_option/modifier_option.disable_until_eod.container';
import ModifierOptionEditContainer from './modifier_option/modifier_option.edit.container';
import ModifierOptionEnableContainer from './modifier_option/modifier_option.enable.container';
import ModifierTypeAddContainer from './modifier_type/modifier_type.add.container';
import ModifierTypeCopyContainer from './modifier_type/modifier_type.copy.container';
import ModifierTypeDeleteContainer from './modifier_type/modifier_type.delete.container';
import ModifierTypeEditContainer from './modifier_type/modifier_type.edit.container';

const ModifierTypeNullGuard = createNullGuard(useModifierTypeById);

const ModifierOptionAdd = () => {
  const modifierTypeId = useAtomValue(selectedModifierTypeIdAtom);
  const closeDialogue = useSetAtom(closeDialogueAtom);
  const dialogueState = useAtomValue(dialogueStateAtom);

  return (
    <ModifierTypeNullGuard
      id={modifierTypeId}
      child={(modifierType) => (
        <DialogContainer
          maxWidth={'xl'}
          title={`Add Modifier Option for Type: ${modifierType.name}`}
          onClose={() => {
            closeDialogue();
          }}
          open={dialogueState === 'ModifierOptionAdd'}
          innerComponent={
            <ModifierOptionAddContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifierTypeId={modifierType.id}
            />
          }
        />
      )}
    />
  );
};

const ModifierDialoguesContainer = () => {
  const dialogueState = useAtomValue(dialogueStateAtom);
  const modifierOptionId = useAtomValue(selectedModifierOptionIdAtom);
  const modifierTypeId = useAtomValue(selectedModifierTypeIdAtom);
  const closeDialogue = useSetAtom(closeDialogueAtom);

  return (
    <>
      <DialogContainer
        maxWidth={'xl'}
        title={'Edit Modifier Option'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierOptionEdit'}
        innerComponent={
          modifierOptionId !== null &&
          modifierTypeId !== null && (
            <ModifierOptionEditContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
              modifier_option_id={modifierOptionId}
            />
          )
        }
      />
      <DialogContainer
        title={'Disable Modifier Option Until End-of-Day'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierOptionDisableUntilEod'}
        innerComponent={
          modifierOptionId !== null &&
          modifierTypeId !== null && (
            <ModifierOptionDisableUntilEodContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
              modifier_option_id={modifierOptionId}
            />
          )
        }
      />
      <DialogContainer
        title={'Disable Modifier Option'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierOptionDisable'}
        innerComponent={
          modifierOptionId !== null &&
          modifierTypeId !== null && (
            <ModifierOptionDisableContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
              modifier_option_id={modifierOptionId}
            />
          )
        }
      />
      <DialogContainer
        title={'Enable Modifier Option'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierOptionEnable'}
        innerComponent={
          modifierOptionId !== null &&
          modifierTypeId !== null && (
            <ModifierOptionEnableContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
              modifier_option_id={modifierOptionId}
            />
          )
        }
      />
      <DialogContainer
        title={'Delete Modifier Option'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierOptionDelete'}
        innerComponent={
          modifierOptionId !== null &&
          modifierTypeId !== null && (
            <ModifierOptionDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
              modifier_option_id={modifierOptionId}
            />
          )
        }
      />
      <ModifierOptionAdd />
      {dialogueState === 'ModifierTypeAdd' && (
        <ModifierTypeAddContainer
          onCloseCallback={() => {
            closeDialogue();
          }}
        />
      )}
      {dialogueState === 'ModifierTypeEdit' && modifierTypeId !== null && (
        <ModifierTypeEditContainer
          onCloseCallback={() => {
            closeDialogue();
          }}
          modifier_type_id={modifierTypeId}
        />
      )}
      <DialogContainer
        title={'Copy Modifier Type'}
        maxWidth={'xl'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierTypeCopy'}
        innerComponent={
          modifierTypeId !== null && (
            <ModifierTypeCopyContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifierTypeId={modifierTypeId}
            />
          )
        }
      />
      <DialogContainer
        title={'Delete Modifier Type'}
        onClose={() => {
          closeDialogue();
        }}
        open={dialogueState === 'ModifierTypeDelete'}
        innerComponent={
          modifierTypeId !== null && (
            <ModifierTypeDeleteContainer
              onCloseCallback={() => {
                closeDialogue();
              }}
              modifier_type_id={modifierTypeId}
            />
          )
        }
      />
    </>
  );
};

export default ModifierDialoguesContainer;
