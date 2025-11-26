import { DialogContainer } from "@wcp/wario-ux-shared/containers";
import { getModifierTypeEntryById } from "@wcp/wario-ux-shared/redux";

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { closeDialogue } from '../../../redux/slices/CatalogSlice';

import ModifierOptionAddContainer from "./modifier_option/modifier_option.add.container";
import ModifierOptionDeleteContainer from "./modifier_option/modifier_option.delete.container";
import ModifierOptionDisableContainer from "./modifier_option/modifier_option.disable.container";
import ModifierOptionDisableUntilEodContainer from "./modifier_option/modifier_option.disable_until_eod.container";
import ModifierOptionEditContainer from "./modifier_option/modifier_option.edit.container";
import ModifierOptionEnableContainer from "./modifier_option/modifier_option.enable.container";
import ModifierTypeAddContainer from "./modifier_type/modifier_type.add.container";
import ModifierTypeCopyContainer from "./modifier_type/modifier_type.copy.container";
import ModifierTypeDeleteContainer from "./modifier_type/modifier_type.delete.container";
import ModifierTypeEditContainer from "./modifier_type/modifier_type.edit.container";

const ModifierDialoguesContainer = () => {
  const dispatch = useAppDispatch();
  const dialogueState = useAppSelector(s => s.catalog.dialogueState);
  const modifierOptionId = useAppSelector(s => s.catalog.selectedModifierOptionId);
  const modifierTypeId = useAppSelector(s => s.catalog.selectedModifierTypeId);
  const modifierTypeName = useAppSelector(s => s.catalog.selectedModifierTypeId !== null ? getModifierTypeEntryById(s.ws.modifierEntries, s.catalog.selectedModifierTypeId).modifierType.name : "");
  return (
    <>
      <DialogContainer
        maxWidth={"xl"}
        title={"Edit Modifier Option"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionEdit'}
        innerComponent={
          modifierOptionId !== null &&
          <ModifierOptionEditContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_option_id={modifierOptionId}
          />
        }
      />
      <DialogContainer
        title={"Disable Modifier Option Until End-of-Day"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionDisableUntilEod'}
        innerComponent={
          modifierOptionId !== null &&
          <ModifierOptionDisableUntilEodContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_option_id={modifierOptionId}
          />
        }
      />
      <DialogContainer
        title={"Disable Modifier Option"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionDisable'}
        innerComponent={
          modifierOptionId !== null &&
          <ModifierOptionDisableContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_option_id={modifierOptionId}
          />
        }
      />
      <DialogContainer
        title={"Enable Modifier Option"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionEnable'}
        innerComponent={
          modifierOptionId !== null &&
          <ModifierOptionEnableContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_option_id={modifierOptionId}
          />
        }
      />
      <DialogContainer
        title={"Delete Modifier Option"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionDelete'}
        innerComponent={
          modifierOptionId !== null &&
          <ModifierOptionDeleteContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_option_id={modifierOptionId}
          />
        }
      />

      <DialogContainer
        maxWidth={"xl"}
        title={`Add Modifier Option for Type: ${modifierTypeName}`}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierOptionAdd'}
        innerComponent={
          modifierTypeId !== null &&
          <ModifierOptionAddContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifierTypeId={modifierTypeId}
          />
        }
      />
      <DialogContainer
        title={"Add Modifier Type"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierTypeAdd'}
        innerComponent={
          <ModifierTypeAddContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
          />
        }
      />
      <DialogContainer
        title={"Edit Modifier Type"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierTypeEdit'}
        innerComponent={
          modifierTypeId !== null &&
          <ModifierTypeEditContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_type_id={modifierTypeId}
          />
        }
      />
      <DialogContainer
        title={"Copy Modifier Type"}
        maxWidth={"xl"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierTypeCopy'}
        innerComponent={
          modifierTypeId !== null &&
          <ModifierTypeCopyContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifierTypeId={modifierTypeId}
          />
        }
      />
      <DialogContainer
        title={"Delete Modifier Type"}
        onClose={() => dispatch(closeDialogue())}
        open={dialogueState === 'ModifierTypeDelete'}
        innerComponent={
          modifierTypeId !== null &&
          <ModifierTypeDeleteContainer
            onCloseCallback={() => { dispatch(closeDialogue()) }}
            modifier_type_id={modifierTypeId}
          />
        }
      />

    </>
  );
};

export default ModifierDialoguesContainer;
