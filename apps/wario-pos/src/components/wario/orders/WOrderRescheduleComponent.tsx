import { useAuth0 } from '@auth0/auth0-react';
import { addDays, parseISO, startOfDay } from "date-fns";
import { range } from 'es-toolkit/compat';
import { useState } from "react";

import { Autocomplete, Grid, TextField } from "@mui/material";
import { LocalizationProvider, StaticDatePicker } from "@mui/x-date-pickers";

import { WDateUtils } from "@wcp/wario-shared";
import { getFulfillmentById, SelectDateFnsAdapter, weakMapCreateSelector } from "@wcp/wario-ux-shared";

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { getWOrderInstanceById, rescheduleOrder } from "../../../redux/slices/OrdersSlice";
import { type RootState } from "../../../redux/store";
import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

const selectFulfillmentForOrderId = weakMapCreateSelector(
  (s: RootState, _oId: string) => s.ws.fulfillments,
  (s: RootState, oId: string) => getWOrderInstanceById(s.orders.orders, oId),
  (fulfillments, order) => getFulfillmentById(fulfillments, order.fulfillment.selectedService)
)

type WOrderRescheduleComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderRescheduleComponent = (props: WOrderRescheduleComponentProps) => {
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useAppDispatch();
  const order = useAppSelector(s => getWOrderInstanceById(s.orders.orders, props.orderId));
  const fulfillmentTimeStep = useAppSelector(s => selectFulfillmentForOrderId(s, props.orderId).timeStep);
  const orderSliceState = useAppSelector(s => s.orders.requestStatus)
  const minDay = useAppSelector(s => startOfDay(s.ws.currentTime));
  const DateAdapter = useAppSelector(s => SelectDateFnsAdapter(s));

  const [selectedDate, setSelectedDate] = useState(order.fulfillment.selectedDate);
  const [selectedTime, setSelectedTime] = useState(order.fulfillment.selectedTime);

  const submitToWario = async () => {
    if (orderSliceState !== 'PENDING') {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order" } });
      await dispatch(rescheduleOrder({ token, orderId: order.id, selectedDate, selectedTime, emailCustomer: true }));
    }
  }
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={() => void submitToWario()}
      isProcessing={orderSliceState === 'PENDING'}
      disableConfirmOn={orderSliceState === 'PENDING'}
      confirmText={'Update'}
      body={
        <>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <LocalizationProvider dateAdapter={DateAdapter}>
              <StaticDatePicker
                displayStaticWrapperAs="desktop"
                openTo="day"
                minDate={minDay}
                maxDate={addDays(minDay, 60)}
                value={parseISO(selectedDate)}
                onChange={(date: Date | null) => { if (date !== null) setSelectedDate(WDateUtils.formatISODate(date)); }}
                slotProps={{
                  toolbar: {
                    hidden: true,
                  },
                }} />
            </LocalizationProvider>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <Autocomplete
              sx={{ m: 'auto', maxWidth: 200 }}
              disableClearable
              className="col"
              options={range(fulfillmentTimeStep, 1440, fulfillmentTimeStep)}
              isOptionEqualToValue={(o, v) => o === v}
              getOptionLabel={x => WDateUtils.MinutesToPrintTime(x)}
              value={selectedTime}
              onChange={(_, v) => { setSelectedTime(v); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              disabled={selectedDate === null}
              renderInput={(params) => <TextField {...params} label={"Time"}
              />}
            />
          </Grid>

        </>
      }
    />
  );
};

export default WOrderRescheduleComponent;
