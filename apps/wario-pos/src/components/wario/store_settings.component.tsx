import { useState } from 'react';

import { type IWSettings } from '@wcp/wario-shared/types';
import { useSettingsQuery } from '@wcp/wario-ux-shared/query';

import { useUpdateSettingsMutation } from '@/hooks/useConfigMutations';

import { toast } from '@/components/snackbar';

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
  const { data: settings } = useSettingsQuery();
  const [isProcessing, setIsProcessing] = useState(false);

  const updateMutation = useUpdateSettingsMutation();

  const onSubmit = (values: KeyValuesRowType<string | number | boolean>[]) => {
    if (!isProcessing && settings) {
      setIsProcessing(true);
      // Build the updated settings object from the key-value pairs
      const body: IWSettings = values.reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {
        ...settings,
      }) as IWSettings;

      updateMutation.mutate(body, {
        onSuccess: () => {
          toast.success(`Updated public facing Key Value Store.`);
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Unable to update public facing Key Value Store. Got error: ${JSON.stringify(error)}.`);
          setIsProcessing(false);
        },
      });
    }
  };

  return (
    settings && (
      <KeyValuesContainer
        canAdd
        canEdit
        canRemove
        isProcessing={isProcessing}
        onSubmit={(values) => {
          onSubmit(values);
        }}
        title={'Customer Facing Store Configuration'}
        values={SETTINGS_FIELD_KEYS.map((key) => ({ key, value: settings[key] }))}
      />
    )
  );
};
