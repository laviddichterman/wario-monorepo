import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

import { type IWSettings } from '@wcp/wario-shared/types';
import { useSettingsQuery } from '@wcp/wario-ux-shared/query';

import { HOST_API } from '@/config';

import { KeyValuesContainer, type KeyValuesRowType } from './keyvalues.container';

// Fields that are part of IWSettings that can be edited as key-value pairs
const SETTINGS_FIELD_KEYS: (keyof IWSettings)[] = [
  'LOCATION_NAME',
  'SQUARE_LOCATION',
  'SQUARE_LOCATION_ALTERNATE',
  'SQUARE_APPLICATION_ID',
  'DEFAULT_FULFILLMENTID',
  'TAX_RATE',
  'ALLOW_ADVANCED',
  'TIP_PREAMBLE',
  'LOCATION_PHONE_NUMBER',
];

export const StoreSettingsComponent = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: settings } = useSettingsQuery();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const onSubmit = async (values: KeyValuesRowType<string | number | boolean>[]) => {
    if (!isProcessing && settings) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order_config' } });
        // Build the updated settings object from the key-value pairs
        const body: IWSettings = values.reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {
          ...settings,
        }) as IWSettings;
        const response = await fetch(`${HOST_API}/api/v1/config/settings`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Updated public facing Key Value Store.`);
          await response.json();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to update public facing Key Value Store. Got error: ${JSON.stringify(error)}.`, {
          variant: 'error',
        });
        setIsProcessing(false);
      }
    }
  };

  return (
    settings && (
      <KeyValuesContainer
        canAdd
        canEdit
        canRemove
        isProcessing={isProcessing}
        onSubmit={(values) => void onSubmit(values)}
        title={'Customer Facing Store Configuration'}
        values={SETTINGS_FIELD_KEYS.map((key) => ({ key, value: settings[key] }))}
      />
    )
  );
};
