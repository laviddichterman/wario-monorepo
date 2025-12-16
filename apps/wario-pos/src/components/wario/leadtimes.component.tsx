import { useEffect, useMemo, useState } from 'react';

import { Button, Card, CardHeader, Grid } from '@mui/material';

import { useFulfillments } from '@wcp/wario-ux-shared/query';

import { useUpdateLeadTimeMutation } from '@/hooks/useConfigMutations';

import { toast } from '@/components/snackbar';

import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';

export const LeadTimesComp = () => {
  const fulfillments = useFulfillments();

  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [localLeadTime, setLocalLeadTime] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // maintains the state of the dirty array and the localLeadTimes
  useEffect(() => {
    // overwrite the local lead time with either the dirty value or the value from the received fulfillments
    const newLocalLeadTime = fulfillments.reduce((acc: Record<string, number>, fulfillment) => {
      const id = fulfillment.id;
      const isDirty = Object.hasOwn(dirty, id) && dirty[id] && Object.hasOwn(localLeadTime, id);
      return {
        ...acc,
        [fulfillment.id]: isDirty ? localLeadTime[fulfillment.id] : fulfillment.leadTime,
      };
    }, {});
    setDirty(
      fulfillments.reduce(
        (acc: Record<string, boolean>, fulfillment) => ({
          ...acc,
          [fulfillment.id]: newLocalLeadTime[fulfillment.id] !== fulfillment.leadTime,
        }),
        {},
      ),
    );
    setLocalLeadTime(newLocalLeadTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillments, setDirty, setLocalLeadTime]);

  const leadtimesToUpdate: Record<string, number> = useMemo(
    () =>
      Object.entries(localLeadTime).reduce((acc, [key, value]) => (dirty[key] ? { ...acc, [key]: value } : acc), {}),
    [dirty, localLeadTime],
  );

  const onChangeLeadTimes = (fId: string, leadTime: number) => {
    if (localLeadTime[fId] !== leadTime) {
      setLocalLeadTime({ ...localLeadTime, [fId]: leadTime });
      setDirty({ ...dirty, [fId]: fulfillments.find((x) => x.id === fId)?.leadTime !== leadTime });
    }
  };

  const updateMutation = useUpdateLeadTimeMutation();

  const onSubmit = () => {
    if (!isProcessing) {
      setIsProcessing(true);
      updateMutation.mutate(leadtimesToUpdate, {
        onSuccess: () => {
          toast.success(
            `
              Updated lead time(s): ${Object.entries(leadtimesToUpdate)
                .map(
                  ([key, value]) =>
                    `${fulfillments.find((x) => x.id === key)?.displayName ?? key}: ${value.toString()} minutes`,
                )
                .join(', ')}
            `,
          );

          setDirty(fulfillments.reduce((acc, fulfillment) => ({ ...acc, [fulfillment.id]: false }), {}));
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Failed to update leadtimes with error: ${JSON.stringify(error)}`);
          setIsProcessing(false);
        },
      });
    }
  };
  return (
    <div>
      <Card>
        <CardHeader title="Single pizza lead time:" sx={{ mb: 3 }} />
        <Grid container spacing={2} justifyContent="center">
          <Grid
            spacing={2}
            container
            alignItems={'center'}
            size={{
              xs: 8,
              md: 10,
            }}
          >
            {Object.values(fulfillments).map((fulfillment) => {
              return (
                <Grid
                  key={fulfillment.id}
                  size={{
                    xs: fulfillments.length % 2 === 0 ? 6 : 12,
                    md: fulfillments.length % 2 === 0 ? 6 : fulfillments.length % 3 === 0 ? 4 : 12,
                  }}
                >
                  <IntNumericPropertyComponent
                    sx={{ ml: 3, mb: 2, mr: 1 }}
                    min={1}
                    color={dirty[fulfillment.id] ? 'warning' : 'primary'}
                    disabled={isProcessing}
                    label={fulfillment.displayName}
                    value={dirty[fulfillment.id] ? localLeadTime[fulfillment.id] : fulfillment.leadTime}
                    setValue={(e: number) => {
                      onChangeLeadTimes(fulfillment.id, e);
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
          <Grid
            sx={{ py: 2 }}
            size={{
              xs: 4,
              md: 2,
            }}
          >
            <Button
              sx={{ mx: 3, px: 1, py: 2 }}
              disabled={isProcessing || Object.keys(leadtimesToUpdate).length === 0}
              onClick={() => {
                onSubmit();
              }}
            >
              Push Changes
            </Button>
          </Grid>
        </Grid>
      </Card>
    </div>
  );
};
