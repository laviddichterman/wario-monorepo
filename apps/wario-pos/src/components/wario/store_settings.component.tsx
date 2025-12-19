import { useCallback, useEffect, useState } from 'react';

import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
} from '@mui/material';

import { type IWSettings } from '@wcp/wario-shared/types';
import { useSettingsQuery } from '@wcp/wario-ux-shared/query';

import { useUpdateSettingsMutation } from '@/hooks/useConfigMutations';

import { toast } from '@/components/snackbar';

const createFormState = (settings: IWSettings): IWSettings => ({
  LOCATION_NAME: settings.LOCATION_NAME,
  SQUARE_LOCATION: settings.SQUARE_LOCATION,
  SQUARE_LOCATION_ALTERNATE: settings.SQUARE_LOCATION_ALTERNATE,
  SQUARE_APPLICATION_ID: settings.SQUARE_APPLICATION_ID,
  DEFAULT_FULFILLMENTID: settings.DEFAULT_FULFILLMENTID,
  TAX_RATE: settings.TAX_RATE,
  ALLOW_ADVANCED: settings.ALLOW_ADVANCED,
  TIP_PREAMBLE: settings.TIP_PREAMBLE,
  LOCATION_PHONE_NUMBER: settings.LOCATION_PHONE_NUMBER,
});

export const StoreSettingsComponent = () => {
  const { data: settings } = useSettingsQuery();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formState, setFormState] = useState<IWSettings | null>(null);

  const updateMutation = useUpdateSettingsMutation();

  // Initialize form state when settings are loaded
  useEffect(() => {
    if (settings && !formState) {
      setFormState(createFormState(settings));
    }
  }, [settings, formState]);

  const handleStringChange = useCallback(
    (field: keyof IWSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
    },
    [],
  );

  const handleNumberChange = useCallback(
    (field: keyof IWSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        setFormState((prev) => (prev ? { ...prev, [field]: value } : prev));
      }
    },
    [],
  );

  const handleBooleanChange = useCallback(
    (field: keyof IWSettings) => (_e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setFormState((prev) => (prev ? { ...prev, [field]: checked } : prev));
    },
    [],
  );

  const onSubmit = () => {
    if (!isProcessing && settings && formState) {
      setIsProcessing(true);
      const oldSettings = Object.keys(formState).reduce(
        (acc, key) => ({ ...acc, [key]: settings[key as keyof IWSettings] }),
        {},
      );
      const body: IWSettings = {
        ...oldSettings,
        ...formState,
      };

      updateMutation.mutate(body, {
        onSuccess: () => {
          toast.success(`Updated store settings.`);
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Unable to update store settings. Got error: ${JSON.stringify(error)}.`);
          setIsProcessing(false);
        },
      });
    }
  };

  if (!settings || !formState) {
    return null;
  }

  return (
    <Card>
      <CardHeader title="Store Settings" />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Location Information */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Location Name"
                value={formState.LOCATION_NAME}
                onChange={handleStringChange('LOCATION_NAME')}
                disabled={isProcessing}
                helperText="Name of the store location"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Location Phone Number"
                value={formState.LOCATION_PHONE_NUMBER}
                onChange={handleStringChange('LOCATION_PHONE_NUMBER')}
                disabled={isProcessing}
                helperText="Store phone number"
              />
            </Grid>
          </Grid>

          {/* Square Integration */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Square Location ID"
                value={formState.SQUARE_LOCATION}
                onChange={handleStringChange('SQUARE_LOCATION')}
                disabled={isProcessing}
                helperText="Primary Square location ID"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Square Location Alternate"
                value={formState.SQUARE_LOCATION_ALTERNATE}
                onChange={handleStringChange('SQUARE_LOCATION_ALTERNATE')}
                disabled={isProcessing}
                helperText="Alternate Square location ID"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Square Application ID"
                value={formState.SQUARE_APPLICATION_ID}
                onChange={handleStringChange('SQUARE_APPLICATION_ID')}
                disabled={isProcessing}
                helperText="Square application ID"
              />
            </Grid>
          </Grid>

          {/* Order Configuration */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Default Fulfillment ID"
                value={formState.DEFAULT_FULFILLMENTID}
                onChange={handleStringChange('DEFAULT_FULFILLMENTID')}
                disabled={isProcessing}
                helperText="Default fulfillment configuration ID"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Tax Rate"
                value={formState.TAX_RATE}
                onChange={handleNumberChange('TAX_RATE')}
                disabled={isProcessing}
                slotProps={{
                  input: {
                    inputProps: { min: 0, step: 0.001 },
                  },
                }}
                helperText="Tax rate as a decimal (e.g., 0.0825 for 8.25%)"
              />
            </Grid>
          </Grid>

          {/* Tip Configuration */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Tip Preamble"
                value={formState.TIP_PREAMBLE}
                onChange={handleStringChange('TIP_PREAMBLE')}
                disabled={isProcessing}
                helperText="Text displayed before tip selection"
              />
            </Grid>
          </Grid>

          {/* Feature Flags */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.ALLOW_ADVANCED}
                    onChange={handleBooleanChange('ALLOW_ADVANCED')}
                    disabled={isProcessing}
                  />
                }
                label="Allow Advanced Options"
              />
            </Grid>
          </Grid>
        </Box>
      </CardContent>
      <CardActions>
        <Button disabled={isProcessing} onClick={onSubmit} variant="contained">
          Save Changes
        </Button>
      </CardActions>
    </Card>
  );
};
