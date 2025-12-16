import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { Grid, Typography } from '@mui/material';

import {
  printerGroupFormAtom,
  printerGroupFormDirtyFieldsAtom,
  printerGroupFormProcessingAtom,
  type PrinterGroupFormState,
} from '@/atoms/forms/printerGroupFormAtoms';

import ExternalIdsExpansionPanelComponent from '../../ExternalIdsExpansionPanelComponent';
import { StringPropertyComponent } from '../../property-components/StringPropertyComponent';
import { ToggleBooleanPropertyComponent } from '../../property-components/ToggleBooleanPropertyComponent';

export const PrinterGroupFormBody = () => {
  const [form, setForm] = useAtom(printerGroupFormAtom);
  const isProcessing = useAtomValue(printerGroupFormProcessingAtom);
  const setDirtyFields = useSetAtom(printerGroupFormDirtyFieldsAtom);

  if (!form) return null;

  const updateField = <K extends keyof PrinterGroupFormState>(field: K, value: PrinterGroupFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setDirtyFields((prev) => new Set(prev).add(field));
  };

  return (
    <Grid container spacing={2}>
      {/* ==============================
          IDENTITY
         ============================== */}
      <Grid size={12}>
        <StringPropertyComponent
          disabled={isProcessing}
          label="Name"
          value={form.name}
          setValue={(v) => {
            updateField('name', v);
          }}
        />
      </Grid>

      {/* ==============================
          CONFIGURATION
         ============================== */}
      <Grid size={12} sx={{ mt: 1 }}>
        <Typography variant="overline" color="text.secondary">
          Configuration
        </Typography>
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
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
      <Grid size={{ xs: 6, sm: 4 }}>
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
    </Grid>
  );
};
