import { useAtom, useAtomValue } from 'jotai';

import { Grid } from '@mui/material';

import {
  printerGroupFormAtom,
  printerGroupFormProcessingAtom,
  type PrinterGroupFormState,
  usePrinterGroupForm,
} from '@/atoms/forms/printerGroupFormAtoms';

import ExternalIdsExpansionPanelComponent from '../../ExternalIdsExpansionPanelComponent';
import { StringPropertyComponent } from '../../property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '../../property-components/ToggleBooleanPropertyComponent';
import { ElementActionComponent } from '../element.action.component';

export interface PrinterGroupEditProps {
  printerGroupId: string | null;
  onCloseCallback: VoidFunction;
}

export const PrinterGroupFormBody = () => {
  const [form, setForm] = useAtom(printerGroupFormAtom);
  const isProcessing = useAtomValue(printerGroupFormProcessingAtom);

  if (!form) return null;

  const updateField = <K extends keyof PrinterGroupFormState>(field: K, value: PrinterGroupFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <>
      <Grid
        size={{
          xs: 12,
          sm: 4,
        }}
      >
        <StringPropertyComponent
          disabled={isProcessing}
          label="Name"
          value={form.name}
          setValue={(v) => {
            updateField('name', v);
          }}
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 4,
        }}
      >
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Single Item Per Ticket"
          value={form.singleItemPerTicket}
          setValue={(v) => {
            updateField('singleItemPerTicket', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid
        size={{
          xs: 6,
          sm: 4,
        }}
      >
        <ToggleBooleanPropertyComponent
          disabled={isProcessing}
          label="Is Expo Printer"
          value={form.isExpo}
          setValue={(v) => {
            updateField('isExpo', v);
          }}
          labelPlacement="end"
        />
      </Grid>
      <Grid size={12}>
        <ExternalIdsExpansionPanelComponent
          title="External IDs"
          disabled={isProcessing}
          value={form.externalIds}
          setValue={(v) => {
            updateField('externalIds', v);
          }}
        />
      </Grid>
    </>
  );
};

export interface PrinterGroupFormProps {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  disableConfirm?: boolean;
  children?: React.ReactNode;
}

export const PrinterGroupComponent = ({
  confirmText,
  onCloseCallback,
  onConfirmClick,
  disableConfirm = false,
  children,
}: PrinterGroupFormProps) => {
  const { isValid, isProcessing } = usePrinterGroupForm();

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={onConfirmClick}
      isProcessing={isProcessing}
      disableConfirmOn={disableConfirm || !isValid || isProcessing}
      confirmText={confirmText}
      body={
        <>
          <PrinterGroupFormBody />
          {children}
        </>
      }
    />
  );
};

export default PrinterGroupComponent;
