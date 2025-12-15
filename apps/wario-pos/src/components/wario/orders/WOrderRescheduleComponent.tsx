import { addDays, parseISO, startOfDay } from 'date-fns';
import { range } from 'es-toolkit/compat';
import { useState } from 'react';

import { Autocomplete, Grid, TextField } from '@mui/material';
import { StaticDatePicker } from '@mui/x-date-pickers';

import { WDateUtils } from '@wcp/wario-shared/logic';
import { useCurrentTime, useValueFromFulfillmentById } from '@wcp/wario-ux-shared/query';

import { useOrderById, useRescheduleOrderMutation } from '@/hooks/useOrdersQuery';

import { ElementActionComponent, type ElementActionComponentProps } from '../menu/element.action.component';

type WOrderRescheduleComponentProps = {
  orderId: string;
  onCloseCallback: ElementActionComponentProps['onCloseCallback'];
};
const WOrderRescheduleComponent = (props: WOrderRescheduleComponentProps) => {
  const rescheduleMutation = useRescheduleOrderMutation();
  const currentTime = useCurrentTime();
  const order = useOrderById(props.orderId);
  const fulfillmentTimeStep = useValueFromFulfillmentById(order?.fulfillment.selectedService ?? '', 'timeStep');

  const [selectedDate, setSelectedDate] = useState(order?.fulfillment.selectedDate ?? '');
  const [selectedTime, setSelectedTime] = useState(order?.fulfillment.selectedTime ?? 0);

  const submitToWario = () => {
    if (order) {
      rescheduleMutation.mutate(
        { orderId: order.id, newDate: selectedDate, newTime: selectedTime },
        {
          onSuccess: () => {},
        },
      );
    }
  };

  if (!order) return null;
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={submitToWario}
      isProcessing={rescheduleMutation.isPending}
      disableConfirmOn={rescheduleMutation.isPending}
      confirmText={'Update'}
      body={
        <>
          <Grid
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              openTo="day"
              minDate={startOfDay(currentTime)}
              maxDate={addDays(startOfDay(currentTime), 60)}
              value={parseISO(selectedDate)}
              onChange={(date: Date | null) => {
                if (date !== null) setSelectedDate(WDateUtils.formatISODate(date));
              }}
              slotProps={{
                toolbar: {
                  hidden: true,
                },
              }}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <Autocomplete
              sx={{ m: 'auto', maxWidth: 200 }}
              disableClearable
              className="col"
              options={range(fulfillmentTimeStep ?? 15, 1440, fulfillmentTimeStep ?? 15)}
              isOptionEqualToValue={(o, v) => o === v}
              getOptionLabel={(x) => WDateUtils.MinutesToPrintTime(x)}
              value={selectedTime}
              onChange={(_, v) => {
                setSelectedTime(v);
              }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              disabled={selectedDate === null}
              renderInput={(params) => <TextField {...params} label={'Time'} />}
            />
          </Grid>
        </>
      }
    />
  );
};

export default WOrderRescheduleComponent;
