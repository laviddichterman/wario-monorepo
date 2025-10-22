import { createListenerMiddleware, isAnyOf, type ListenerEffectAPI } from '@reduxjs/toolkit'
import type { TypedStartListening } from '@reduxjs/toolkit'
import { enqueueSnackbar } from 'notistack'

import { CanThisBeOrderedAtThisTimeAndFulfillmentCatalog, type CartEntry, WCPProductGenerateMetadata, WDateUtils } from '@wcp/wario-shared';
import { getFulfillmentById, receiveCatalog, receiveFulfillments, receiveSettings, scrollToIdOffsetAfterDelay, SelectCatalogSelectors, setCurrentTime } from '@wcp/wario-ux-shared';

import { type AppDispatch, GetNextAvailableServiceDateTime, type RootState, SelectCategoryExistsAndIsAllowedForFulfillment, SelectOptionsForServicesAndDate } from '@/app/store'

import { backStage, nextStage, setStage, STEPPER_STAGE_ENUM } from './StepperSlice';
import { addToCart, getCart, getDeadCart, killAllCartEntries, removeFromCart, reviveAllCartEntries, updateCartQuantity, updateManyCartProducts } from './WCartSlice';
import { clearCustomizer, updateCustomizerProduct } from './WCustomizerSlice';
import { SelectServiceDateTime, setDate, setSelectedDateExpired, setSelectedTimeExpired, setService, setTime } from './WFulfillmentSlice';
import { incrementTimeBumps, setTimeToStage } from './WMetricsSlice';


export const ListeningMiddleware = createListenerMiddleware()

export type AppStartListening = TypedStartListening<RootState, AppDispatch>

export const startAppListening = ListeningMiddleware.startListening.withTypes<RootState, AppDispatch>();

startAppListening({
  matcher: isAnyOf(setCurrentTime,
    setService,
    receiveFulfillments,
    receiveSettings,
    receiveCatalog,
    addToCart,
    removeFromCart,
    updateCartQuantity),
  effect: (_, api: ListenerEffectAPI<RootState, AppDispatch>) => {
    const originalState = api.getOriginalState();
    // we check for the pending state because we want to avoid the case of an in-flight request where this middleware starts messing with state. better to let the response run its course.
    const isAlreadySubmitted = originalState.payment.submitToWarioStatus === 'SUCCEEDED' || originalState.payment.submitToWarioStatus === 'PENDING';
    const previouslySelectedDate = originalState.fulfillment.selectedDate;
    const previouslySelectedTime = originalState.fulfillment.selectedTime;
    const selectedService = api.getState().fulfillment.selectedService;
    const selectedFulfillment = selectedService !== null ? getFulfillmentById(api.getState().ws.fulfillments, selectedService) : null;
    if (previouslySelectedDate !== null && previouslySelectedTime !== null && selectedService !== null && selectedFulfillment && !isAlreadySubmitted) {
      const newOptions = SelectOptionsForServicesAndDate(api.getState(), previouslySelectedDate, [selectedService]);
      if (!newOptions.find(x => x.value === previouslySelectedTime)) {
        if (newOptions.length > 0) {
          const earlierOptions = newOptions.filter(x => x.value < previouslySelectedTime);
          const laterOptions = newOptions.filter(x => x.value > previouslySelectedTime);
          const closestEarlierOption = earlierOptions.length > 0 ? earlierOptions[earlierOptions.length - 1] : null;
          const closestLaterOption = laterOptions.length > 0 ? laterOptions[0] : null;
          const newOption = (closestEarlierOption !== null && closestLaterOption !== null) ?
            ((previouslySelectedTime - closestEarlierOption.value) <= (closestLaterOption.value - previouslySelectedTime) ?
              closestEarlierOption : closestLaterOption) :
            (closestEarlierOption ?? closestLaterOption);
          // we know newOption is not null because newOptions.length > 0
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion 
          api.dispatch(setTime(newOption!.value));
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          enqueueSnackbar(`Previously selected time of ${WDateUtils.MinutesToPrintTime(previouslySelectedTime)} is no longer available for your order. Updated to closest available time of ${WDateUtils.MinutesToPrintTime(newOption!.value)}.`, { variant: 'warning' });
          api.dispatch(incrementTimeBumps());
          api.dispatch(setSelectedTimeExpired());
        } else {
          // no options for date anymore, send them back to the time selection screen
          api.dispatch(setSelectedDateExpired());
          api.dispatch(setDate(null));
          api.dispatch(setTime(null));
          enqueueSnackbar(`Previously selected date is no longer available for your order.`, { variant: 'warning' });
          api.dispatch(setStage(STEPPER_STAGE_ENUM.TIMING));
        }
      }
    }
  }
});

// handle scrolling on transitions
startAppListening({
  matcher: isAnyOf(nextStage, backStage, setStage),
  effect: (_, _api: ListenerEffectAPI<RootState, AppDispatch>) => {
    //const toId = `WARIO_step_${api.getState().stepper.stage}`;
    scrollToIdOffsetAfterDelay("WARIO_order", 500);
  }
});

// listener for stage progression time metrics
startAppListening({
  actionCreator: nextStage,
  effect: (_, api: ListenerEffectAPI<RootState, AppDispatch>) => {
    api.dispatch(setTimeToStage({ stage: api.getOriginalState().stepper.stage, ticks: Date.now() }));
  }
});

startAppListening({
  matcher: isAnyOf(receiveCatalog, setTime, setDate, setService),
  effect: (_: unknown, api: ListenerEffectAPI<RootState, AppDispatch>) => {
    const socketIoState = api.getState().ws;
    const catalog = SelectCatalogSelectors(socketIoState);
    const currentTime = api.getState().ws.currentTime;
    const fulfillments = api.getState().ws.fulfillments;
    if (currentTime !== 0) {
      const service = api.getState().fulfillment.selectedService ?? Object.keys(fulfillments)[0];
      const menuTime = SelectServiceDateTime(api.getState().fulfillment) ?? WDateUtils.ComputeServiceDateTime(GetNextAvailableServiceDateTime(api.getState()));
      // determine if anything we have in the cart or the customizer is impacted and update accordingly
      const customizerProduct = api.getState().customizer.selectedProduct;
      const customizerCategoryId = api.getState().customizer.categoryId;
      let regenerateCustomizerMetadata = false;
      if (customizerProduct !== null) {
        if (!CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(customizerProduct.p.productId, customizerProduct.p.modifiers, catalog, menuTime, service, false) ||
          (customizerCategoryId !== null &&
            !SelectCategoryExistsAndIsAllowedForFulfillment(socketIoState.categories, customizerCategoryId, service))) {
          enqueueSnackbar(`${customizerProduct.m.name} as configured is no longer available. Please check availability and try again.`, { variant: 'warning' });
          api.dispatch(clearCustomizer());
        }
        else {
          regenerateCustomizerMetadata = true;
        }
      }
      const cart = getCart(api.getState().cart.cart);
      const deadCart = getDeadCart(api.getState().cart.deadCart);
      const toKill: CartEntry[] = [];
      const toRefreshMetadata: CartEntry[] = [];
      cart.forEach(x => !CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(x.product.p.productId, x.product.p.modifiers, catalog, menuTime, service, true) || !SelectCategoryExistsAndIsAllowedForFulfillment(socketIoState.categories, x.categoryId, service) ? toKill.push(x) : toRefreshMetadata.push(x));
      const toRevive = deadCart.filter(x => CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(x.product.p.productId, x.product.p.modifiers, catalog, menuTime, service, true) && SelectCategoryExistsAndIsAllowedForFulfillment(socketIoState.categories, x.categoryId, service));

      if (toKill.length > 0) {
        if (toKill.length < 4) {
          toKill.forEach(x => enqueueSnackbar(`${x.product.m.name} as configured is no longer available.`, { variant: 'warning' }));
        } else {
          enqueueSnackbar(`The ${toKill.map(x => x.product.m.name).reduceRight((acc, prod, i) => i === 0 ? acc : (i === toKill.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`), "")} as configured are no longer available.`, { variant: 'warning' });
        }
        api.dispatch(killAllCartEntries(toKill));
      }
      if (regenerateCustomizerMetadata) {
        // we know customizerProduct is not null because regenerateCustomizerMetadata is true
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        api.dispatch(updateCustomizerProduct({ p: customizerProduct!.p, m: WCPProductGenerateMetadata(customizerProduct!.p.productId, customizerProduct!.p.modifiers, catalog, menuTime, service) }));
      }
      if (toRefreshMetadata.length > 0) {
        api.dispatch(updateManyCartProducts(toRefreshMetadata.map(x => ({ id: x.id, product: { ...x.product, m: WCPProductGenerateMetadata(x.product.p.productId, x.product.p.modifiers, catalog, menuTime, service) } }))));
      }
      if (toRevive.length > 0) {
        if (toRevive.length < 4) {
          toRevive.forEach(x => enqueueSnackbar(`${x.product.m.name} as configured is once again available and has been returned to your order.`, { variant: 'warning' }));
        } else {
          enqueueSnackbar(`The ${toRevive.map(x => x.product.m.name).reduceRight((acc, prod, i) => i === 0 ? acc : (i === toRevive.length - 1 ? `${acc}, and ${prod}` : `${acc}, ${prod}`), "")} as configured are once again available and returned to your order.`, { variant: 'warning' });
        }
        api.dispatch(reviveAllCartEntries(toRevive.map(x => ({ ...x, product: { ...x.product, m: WCPProductGenerateMetadata(x.product.p.productId, x.product.p.modifiers, catalog, menuTime, service) } }))));
      }
    }
    //api.getState().fulfillment 
  }
});

export default ListeningMiddleware;