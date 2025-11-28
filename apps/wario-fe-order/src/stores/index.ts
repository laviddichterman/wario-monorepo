// Zustand stores for wario-fe-order
// These replace Redux slices with simpler, more direct state management

export {
  type CartState,
  type CartStore,
  findDuplicateInCart,
  selectCart,
  selectCartAsDto,
  selectCartEntry,
  selectDeadCart,
  useCartStore,
} from './useCartStore';

export {
  type CustomerInfoRHF,
  customerInfoSchema,
  type CustomerInfoStore,
  selectCustomerInfo,
  useCustomerInfoStore,
} from './useCustomerInfoStore';

export {
  type CustomizerState,
  type CustomizerStore,
  selectCartId,
  selectCategoryId,
  selectOptionState,
  selectSelectedWProduct,
  selectShowAdvanced,
  useCustomizerStore,
} from './useCustomizerStore';

export {
  NUM_STAGES,
  selectStage,
  STEPPER_STAGE_ENUM,
  type StepperStore,
  useStepperStore,
} from './useStepperStore';

export {
  type DeliveryInfoFormData,
  type DeliveryValidationStatus,
  deliveryAddressSchema,
  dineInSchema,
  type FulfillmentState,
  type FulfillmentStore,
  selectDeliveryInfo,
  selectDeliveryValidationStatus,
  selectDineInInfo,
  selectFulfillmentState,
  selectHasAgreedToTerms,
  selectHasSelectedDateExpired,
  selectHasSelectedTimeExpired,
  selectSelectedDate,
  selectSelectedService,
  selectSelectedTime,
  selectServiceDateTime,
  useFulfillmentStore,
} from './useFulfillmentStore';
