import type { Polygon } from 'geojson';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';

import { DayOfTheWeek, FulfillmentType } from '@wcp/wario-shared/logic';
import type {
  DateIntervalsEntries,
  FulfillmentConfig,
  OperatingHourSpecification,
} from '@wcp/wario-shared/types';

/**
 * Form state for Fulfillment add/edit operations.
 * Uses flat/camelCase field names internally, converted to API format on submission.
 */
export interface FulfillmentFormState {
  shortcode: string;
  exposeFulfillment: boolean;
  displayName: string;
  ordinal: number;
  service: FulfillmentType;
  terms: string[];

  // Messages (flattened from nested object)
  messageDescription: string;
  messageConfirmation: string;
  messageInstructions: string;

  // Category references
  menuBaseCategoryId: string | null;
  orderBaseCategoryId: string | null;
  orderSupplementaryCategoryId: string | null;

  // Payment options
  requirePrepayment: boolean;
  allowPrepayment: boolean;
  allowTipping: boolean;
  autograt: { function: string; percentage: number } | null;
  serviceCharge: string | null;

  // Timing
  leadTime: number;
  leadTimeOffset: number;
  operatingHours: OperatingHourSpecification;
  specialHours: DateIntervalsEntries;
  blockedOff: DateIntervalsEntries;
  minDuration: number;
  maxDuration: number;
  timeStep: number;

  // Optional features
  maxGuests: number | null;
  serviceArea: Polygon | null;
}

const EMPTY_OPERATING_HOURS: OperatingHourSpecification = {
  [DayOfTheWeek.SUNDAY]: [],
  [DayOfTheWeek.MONDAY]: [],
  [DayOfTheWeek.TUESDAY]: [],
  [DayOfTheWeek.WEDNESDAY]: [],
  [DayOfTheWeek.THURSDAY]: [],
  [DayOfTheWeek.FRIDAY]: [],
  [DayOfTheWeek.SATURDAY]: [],
};

/** Default values for "Add" mode */
export const DEFAULT_FULFILLMENT_FORM: FulfillmentFormState = {
  shortcode: '',
  exposeFulfillment: true,
  displayName: '',
  ordinal: 0,
  service: FulfillmentType.PickUp,
  terms: [],
  messageDescription: '',
  messageConfirmation: '',
  messageInstructions: '',
  menuBaseCategoryId: null,
  orderBaseCategoryId: null,
  orderSupplementaryCategoryId: null,
  requirePrepayment: true,
  allowPrepayment: true,
  allowTipping: true,
  autograt: null,
  serviceCharge: null,
  leadTime: 35,
  leadTimeOffset: 0,
  operatingHours: { ...EMPTY_OPERATING_HOURS },
  specialHours: [],
  blockedOff: [],
  minDuration: 0,
  maxDuration: 0,
  timeStep: 15,
  maxGuests: null,
  serviceArea: null,
};

/** Main form atom - null when no form is open */
export const fulfillmentFormAtom = atom<FulfillmentFormState | null>(null);

/** Dirty fields tracking - marks which fields have been modified in edit mode */
export const fulfillmentFormDirtyFieldsAtom = atom<Set<keyof FulfillmentFormState>>(
  new Set<keyof FulfillmentFormState>(),
);

/** API processing state */
export const fulfillmentFormProcessingAtom = atom(false);

/** Validation derived atom */
export const fulfillmentFormIsValidAtom = atom((get) => {
  const form = get(fulfillmentFormAtom);
  if (!form) return false;

  // Required string fields
  if (form.displayName.length === 0) return false;
  if (form.shortcode.length === 0) return false;

  // Required category references
  if (form.menuBaseCategoryId === null) return false;
  if (form.orderBaseCategoryId === null) return false;

  // If exposed, confirmation and instructions are required
  if (form.exposeFulfillment) {
    if (form.messageConfirmation.length === 0) return false;
    if (form.messageInstructions.length === 0) return false;
  }

  return true;
});

type FulfillmentApiBody = Omit<FulfillmentConfig, 'id'>;

/**
 * Convert form state to API request body.
 *
 * Overload 1: When dirtyFields is omitted, returns the FULL body (for POST/create).
 * Overload 2: When dirtyFields is provided, returns only dirty fields (for PATCH/update).
 */
export function toFulfillmentApiBody(form: FulfillmentFormState): FulfillmentApiBody;
export function toFulfillmentApiBody(
  form: FulfillmentFormState,
  dirtyFields: Set<keyof FulfillmentFormState>,
): Partial<FulfillmentApiBody>;
export function toFulfillmentApiBody(
  form: FulfillmentFormState,
  dirtyFields?: Set<keyof FulfillmentFormState>,
): FulfillmentApiBody | Partial<FulfillmentApiBody> {
  // Validate required fields - these should have been checked by validation atom before calling
  if (form.menuBaseCategoryId === null || form.orderBaseCategoryId === null) {
    throw new Error('menuBaseCategoryId and orderBaseCategoryId are required');
  }

  // TypeScript now knows these are non-null after the guard
  const { menuBaseCategoryId, orderBaseCategoryId } = form;

  const fullBody: FulfillmentApiBody = {
    shortcode: form.shortcode,
    exposeFulfillment: form.exposeFulfillment,
    displayName: form.displayName,
    ordinal: form.ordinal,
    service: form.service,
    terms: form.terms.filter((t) => t.length > 0),
    messages: {
      DESCRIPTION: form.messageDescription.length === 0 ? null : form.messageDescription,
      CONFIRMATION: form.messageConfirmation,
      INSTRUCTIONS: form.messageInstructions,
    },
    menuBaseCategoryId,
    orderBaseCategoryId,
    orderSupplementaryCategoryId: form.orderSupplementaryCategoryId,
    requirePrepayment: form.requirePrepayment,
    allowPrepayment: form.allowPrepayment,
    allowTipping: form.allowTipping,
    autograt: form.autograt,
    serviceCharge: form.serviceCharge,
    leadTime: form.leadTime,
    leadTimeOffset: form.leadTimeOffset,
    operatingHours: form.operatingHours,
    specialHours: form.specialHours,
    blockedOff: form.blockedOff,
    minDuration: form.minDuration,
    maxDuration: form.maxDuration,
    timeStep: form.timeStep,
    maxGuests: form.maxGuests ?? undefined,
    serviceArea: form.serviceArea ?? undefined,
  };

  // If no dirty fields provided, return full body (create mode)
  if (!dirtyFields) {
    return fullBody;
  }

  // If dirty fields is empty, also return full body
  if (dirtyFields.size === 0) {
    return fullBody;
  }

  // Check if field is dirty, including mapping nested fields to their parent
  const isDirty = (apiField: keyof FulfillmentApiBody): boolean => {
    if (dirtyFields.has(apiField as keyof FulfillmentFormState)) return true;

    // Special handling for messages - check all related form fields
    if (apiField === 'messages') {
      return (
        dirtyFields.has('messageDescription') ||
        dirtyFields.has('messageConfirmation') ||
        dirtyFields.has('messageInstructions')
      );
    }

    return false;
  };

  // Filter to only dirty fields
  const result: Partial<FulfillmentApiBody> = {};
  for (const key of Object.keys(fullBody)) {
    if (isDirty(key as keyof FulfillmentApiBody)) {
      const typedKey = key as keyof FulfillmentApiBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (result as any)[typedKey] = fullBody[typedKey];
    }
  }
  return result;
}

/** Convert API entity to form state */
export const fromFulfillmentEntity = (entity: FulfillmentConfig): FulfillmentFormState => ({
  shortcode: entity.shortcode,
  exposeFulfillment: entity.exposeFulfillment,
  displayName: entity.displayName,
  ordinal: entity.ordinal,
  service: entity.service,
  terms: entity.terms,
  messageDescription: entity.messages.DESCRIPTION ?? '',
  messageConfirmation: entity.messages.CONFIRMATION,
  messageInstructions: entity.messages.INSTRUCTIONS,
  menuBaseCategoryId: entity.menuBaseCategoryId,
  orderBaseCategoryId: entity.orderBaseCategoryId,
  orderSupplementaryCategoryId: entity.orderSupplementaryCategoryId ?? null,
  requirePrepayment: entity.requirePrepayment,
  allowPrepayment: entity.allowPrepayment,
  allowTipping: entity.allowTipping,
  autograt: entity.autograt ?? null,
  serviceCharge: entity.serviceCharge ?? null,
  leadTime: entity.leadTime,
  leadTimeOffset: entity.leadTimeOffset,
  operatingHours: entity.operatingHours,
  specialHours: entity.specialHours,
  blockedOff: entity.blockedOff,
  minDuration: entity.minDuration,
  maxDuration: entity.maxDuration,
  timeStep: entity.timeStep,
  maxGuests: entity.maxGuests ?? null,
  serviceArea: entity.serviceArea ?? null,
});

/**
 * Hook to manage Fulfillment form state.
 * Returns the form state, a type-safe field updater with dirty tracking, and dirty fields.
 */
export const useFulfillmentForm = () => {
  const [form, setForm] = useAtom(fulfillmentFormAtom);
  const [dirtyFields, setDirtyFields] = useAtom(fulfillmentFormDirtyFieldsAtom);
  const isValid = useAtomValue(fulfillmentFormIsValidAtom);
  const [isProcessing, setIsProcessing] = useAtom(fulfillmentFormProcessingAtom);

  const updateField = useCallback(
    <K extends keyof FulfillmentFormState>(field: K, value: FulfillmentFormState[K]) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
      setDirtyFields((prev) => new Set(prev).add(field));
    },
    [setForm, setDirtyFields],
  );

  const clearDirtyFields = useCallback(() => {
    setDirtyFields(new Set());
  }, [setDirtyFields]);

  return { form, setForm, updateField, isValid, isProcessing, setIsProcessing, dirtyFields, clearDirtyFields };
};
