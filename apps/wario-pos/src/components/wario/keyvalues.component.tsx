import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type KeyValue } from '@wcp/wario-shared/types';

import { useUpdateKeyValueStoreMutation } from '@/hooks/useConfigMutations';
import { useKeyValueStoreQuery } from '@/hooks/useConfigQueries';

import { toast } from '@/components/snackbar';

import KeyValuesContainer from './keyvalues.container';

export const KeyValuesComponent = () => {
  const { data: KEYVALUES } = useKeyValueStoreQuery();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useUpdateKeyValueStoreMutation();

  const onSubmit = (values: KeyValue[]) => {
    if (!isProcessing) {
      setIsProcessing(true);
      updateMutation.mutate(values, {
        onSuccess: (data) => {
          toast.success(`Updated Key Value Store.`);
          queryClient.setQueryData(['kvstore'], data);
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Unable to update Key Value Store. Got error: ${JSON.stringify(error)}.`);
          setIsProcessing(false);
        },
      });
    }
  };
  return KEYVALUES ? (
    <KeyValuesContainer
      canAdd
      canEdit
      canRemove
      isProcessing={isProcessing}
      title="Key Value Store"
      onSubmit={(values) => {
        onSubmit(values);
      }}
      values={Object.entries(KEYVALUES).map(([key, value]) => ({ key, value }))}
    />
  ) : (
    <></>
  );
};
