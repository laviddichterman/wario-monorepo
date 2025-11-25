import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';

import { Button, Card, CardHeader, Grid } from '@mui/material';

import { getFulfillments } from '@wcp/wario-ux-shared';

import { useAppSelector } from '@/hooks/useRedux';

import { HOST_API } from '@/config';

import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';

export const LeadTimesComp = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { getAccessTokenSilently } = useAuth0();

  const FULFILLMENTS = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [localLeadTime, setLocalLeadTime] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // maintains the state of the dirty array and the localLeadTimes
  useEffect(() => {
    // overwrite the local lead time with either the dirty value or the value from the received FULFILLMENTS
    const newLocalLeadTime = FULFILLMENTS.reduce((acc: Record<string, number>, fulfillment) => {
      const id = fulfillment.id;
      const isDirty = Object.hasOwn(dirty, id) && dirty[id] && Object.hasOwn(localLeadTime, id);
      return {
        ...acc,
        [fulfillment.id]: isDirty ?
          localLeadTime[fulfillment.id] : (fulfillment.leadTime ?? 35)
      }
    }, {})
    setDirty(FULFILLMENTS.reduce((acc: Record<string, boolean>, fulfillment) => ({
      ...acc,
      [fulfillment.id]: newLocalLeadTime[fulfillment.id] !== fulfillment.leadTime
    }), {}));
    setLocalLeadTime(newLocalLeadTime);
  }, [FULFILLMENTS, setDirty, setLocalLeadTime]);

  const leadtimesToUpdate = useMemo(() => Object.entries(localLeadTime).reduce((acc, [key, value]) => dirty[key] ? ({ ...acc, [key]: value }) : acc, {}), [dirty, localLeadTime]);

  const onChangeLeadTimes = (fId: string, leadTime: number) => {
    if (localLeadTime[fId] !== leadTime) {
      setLocalLeadTime({ ...localLeadTime, [fId]: leadTime });
      setDirty({ ...dirty, [fId]: FULFILLMENTS.find(x => x.id === fId)?.leadTime !== leadTime });
    }
  };

  const onSubmit = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order_config" } });
        const response = await fetch(`${HOST_API}/api/v1/config/timing/leadtime`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(leadtimesToUpdate)
        });
        if (response.status === 201) {
          enqueueSnackbar(
            `
              Updated lead time(s): ${Object.entries(leadtimesToUpdate).map(([key, value]) =>
              `${FULFILLMENTS.find(x => x.id === key)?.displayName}: ${value} minutes`
            )}
            `)

          setDirty(FULFILLMENTS.reduce((acc, fulfillment) => ({ ...acc, [fulfillment.id]: false }), {}));
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Failed to update leadtimes with error: ${JSON.stringify(error)}`, { variant: 'error' });
        setIsProcessing(false);
      }
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
              md: 10
            }}>
            {Object.values(FULFILLMENTS).map((fulfillment) => {
              return (
                <Grid
                  key={fulfillment.id}
                  size={{
                    xs: FULFILLMENTS.length % 2 === 0 ? 6 : 12,
                    md: FULFILLMENTS.length % 2 === 0 ? 6 : (FULFILLMENTS.length % 3 === 0 ? 4 : 12)
                  }}>
                  <IntNumericPropertyComponent
                    sx={{ ml: 3, mb: 2, mr: 1 }}
                    min={1}
                    color={dirty[fulfillment.id] ? 'warning' : 'primary'}
                    disabled={isProcessing}
                    label={fulfillment.displayName}
                    value={dirty[fulfillment.id] ? localLeadTime[fulfillment.id] : fulfillment.leadTime}
                    setValue={(e: number) => { onChangeLeadTimes(fulfillment.id, e); }}
                  />
                </Grid>
              );
            }
            )}
          </Grid>
          <Grid
            sx={{ py: 2 }}
            size={{
              xs: 4,
              md: 2
            }}>
            <Button sx={{ mx: 3, px: 1, py: 2 }} disabled={isProcessing || Object.keys(leadtimesToUpdate).length === 0} onClick={() => void onSubmit()}>Push Changes</Button>
          </Grid>
        </Grid>
      </Card>
    </div>
  );
};