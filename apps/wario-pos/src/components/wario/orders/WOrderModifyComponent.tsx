import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Alert, Autocomplete, Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';

import { FulfillmentType } from '@wcp/wario-shared/logic';
import { ZodEmailSchema } from '@wcp/wario-ux-shared/common';
import { useFulfillments } from '@wcp/wario-ux-shared/query';

import { useOrderById } from '@/hooks/useOrdersQuery';

// Validation Schema
const modifyOrderSchema = z.object({
  givenName: z.string().min(1, 'First name is required'),
  familyName: z.string().min(1, 'Last name is required'),
  mobileNum: z.string().min(1, 'Phone number is required'),
  email: ZodEmailSchema,
  specialInstructions: z.string(),
  selectedService: z.string().min(1, 'Service is required'),
  partySize: z.number().nullable(),
  // Delivery fields
  deliveryStreet: z.string(),
  deliveryUnit: z.string(),
  deliveryCity: z.string(),
  deliveryState: z.string(),
  deliveryZip: z.string(),
  deliveryInstructions: z.string(),
});

type ModifyOrderFormData = z.infer<typeof modifyOrderSchema>;

export type WOrderModifyComponentProps = {
  orderId: string;
  onCloseCallback: () => void;
};

/**
 * Inline form for modifying an existing order.
 * Supports editing customer info, special instructions, and discounts.
 */
export function WOrderModifyComponent({ orderId, onCloseCallback }: WOrderModifyComponentProps) {
  const order = useOrderById(orderId);
  const fulfillments = useFulfillments();

  // Initialize form with order data
  const defaultValues: ModifyOrderFormData = useMemo(
    () => ({
      givenName: order?.customerInfo.givenName ?? '',
      familyName: order?.customerInfo.familyName ?? '',
      mobileNum: order?.customerInfo.mobileNum ?? '',
      email: order?.customerInfo.email ?? '',
      specialInstructions: order?.specialInstructions ?? '',
      selectedService: order?.fulfillment.selectedService ?? '',
      partySize: order?.fulfillment.dineInInfo?.partySize ?? null,
      deliveryStreet: order?.fulfillment.deliveryInfo?.address ?? '',
      deliveryUnit: order?.fulfillment.deliveryInfo?.address2 ?? '',
      deliveryCity: '', // Not in DTO explicitly, would come from validation components if parsed
      deliveryState: '', // Not in DTO explicitly
      deliveryZip: order?.fulfillment.deliveryInfo?.zipcode ?? '',
      deliveryInstructions: order?.fulfillment.deliveryInfo?.deliveryInstructions ?? '',
    }),
    [order],
  );

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting, isValid },
    reset,
  } = useForm<ModifyOrderFormData>({
    defaultValues,
    resolver: zodResolver(modifyOrderSchema),
    mode: 'onChange',
  });

  // Watch selected service to handle dynamic party size requirement
  const selectedServiceId = useWatch({ control, name: 'selectedService' });
  const partySize = useWatch({ control, name: 'partySize' });

  // Watch delivery fields for validation
  const [deliveryStreet, deliveryCity, deliveryState, deliveryZip] = useWatch({
    control,
    name: ['deliveryStreet', 'deliveryCity', 'deliveryState', 'deliveryZip'],
  });

  // Determine if current service requires party size
  const selectedServiceConfig = useMemo(
    () => fulfillments.find((f) => f.id === selectedServiceId),
    [fulfillments, selectedServiceId],
  );

  const requiresPartySize =
    selectedServiceConfig?.service === FulfillmentType.DineIn || (selectedServiceConfig?.maxGuests ?? 0) > 0;

  const requiresDeliveryInfo =
    selectedServiceConfig?.service === FulfillmentType.Delivery ||
    selectedServiceConfig?.service === FulfillmentType.Shipping;

  // Handle switching service types
  useEffect(() => {
    // If we switch to a service that requires party size, and we don't have one set (or it was null from previous)
    // ensure we validate correctly.
    if (requiresPartySize && partySize === null) {
      // Logic handled by validation state
    }
  }, [selectedServiceId, requiresPartySize, partySize]);

  // Is the form actually valid including our custom business logic?
  const isFormValid =
    isValid &&
    (!requiresPartySize || (partySize !== null && partySize > 0)) &&
    (!requiresDeliveryInfo || (!!deliveryStreet && !!deliveryCity && !!deliveryState && !!deliveryZip));

  // Reset form when order changes
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Track if user has unsaved changes
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onCloseCallback();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    onCloseCallback();
  };

  const onSubmit = (data: ModifyOrderFormData) => {
    // TODO: Placeholder - actual backend integration deferred

    console.log('Order modification submitted:', {
      orderId,
      changes: data,
      originalOrder: order,
    });

    // For now, just close the form
    onCloseCallback();
  };

  if (!order) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading order...</Typography>
      </Box>
    );
  }

  // Compute order total preview from payments array
  // Total paid = sum of all payment amounts
  const amountPaid = order.payments.reduce((sum, p) => sum + p.amount.amount, 0);

  // For now, just show amount paid - actual total computation needs cart calculation
  // TODO: Add live total calculation when discount editing is implemented

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)(e);
      }}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Form Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={3}>
          {/* Customer Info Section */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Customer Information
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Controller
                  name="givenName"
                  control={control}
                  render={({ field }) => <TextField {...field} label="First Name" size="small" fullWidth />}
                />
                <Controller
                  name="familyName"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Last Name" size="small" fullWidth />}
                />
              </Stack>
              <Controller
                name="mobileNum"
                control={control}
                render={({ field }) => <TextField {...field} label="Phone Number" size="small" fullWidth />}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => <TextField {...field} label="Email" size="small" fullWidth type="email" />}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Fulfillment Info Section */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Fulfillment
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="selectedService"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={fulfillments}
                    getOptionLabel={(f) => f.displayName}
                    value={fulfillments.find((f) => f.id === field.value) ?? null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id ?? '');
                    }}
                    renderInput={(params) => <TextField {...params} label="Service Type" size="small" />}
                  />
                )}
              />

              {/* Party Size - only show if current service supports dine-in */}
              {requiresPartySize && (
                <Controller
                  name="partySize"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        field.onChange(isNaN(val as number) ? null : val);
                      }}
                      label="Party Size"
                      size="small"
                      type="number"
                      error={!field.value}
                      helperText={!field.value ? 'Party size is required' : ''}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                  )}
                />
              )}

              {/* Delivery Info - only show if current service is Delivery */}
              {requiresDeliveryInfo && (
                <Stack spacing={2}>
                  <Controller
                    name="deliveryStreet"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Street Address"
                        size="small"
                        fullWidth
                        error={!field.value}
                        helperText={!field.value ? 'Address is required' : ''}
                      />
                    )}
                  />
                  <Controller
                    name="deliveryUnit"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Apt / Unit (Optional)" size="small" fullWidth />
                    )}
                  />
                  <Stack direction="row" spacing={2}>
                    <Controller
                      name="deliveryCity"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="City"
                          size="small"
                          fullWidth
                          error={!field.value}
                          helperText={!field.value ? 'Required' : ''}
                        />
                      )}
                    />
                    <Controller
                      name="deliveryState"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="State"
                          size="small"
                          sx={{ width: '100px' }}
                          error={!field.value}
                          helperText={!field.value ? 'Required' : ''}
                        />
                      )}
                    />
                    <Controller
                      name="deliveryZip"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Zip"
                          size="small"
                          sx={{ width: '100px' }}
                          error={!field.value}
                          helperText={!field.value ? 'Required' : ''}
                        />
                      )}
                    />
                  </Stack>
                  <Controller
                    name="deliveryInstructions"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Delivery Instructions" size="small" fullWidth multiline rows={2} />
                    )}
                  />
                </Stack>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Special Instructions */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Special Instructions
            </Typography>
            <Controller
              name="specialInstructions"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Add any special instructions..."
                />
              )}
            />
          </Box>

          <Divider />

          {/* Discounts Section */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Discounts & Adjustments
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Discount editing will be implemented in a future update.
            </Alert>

            {/* Order Payment Summary */}
            <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Amount Paid:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${(amountPaid / 100).toFixed(2)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Balance and refund calculations will be shown when discount editing is enabled.
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <Alert
          severity="warning"
          sx={{ mx: 2, mb: 1 }}
          action={
            <Button color="inherit" size="small" onClick={handleDiscardChanges}>
              Discard
            </Button>
          }
        >
          You have unsaved changes
        </Alert>
      )}

      {/* Action Buttons */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
        }}
      >
        <Button variant="outlined" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!isDirty || isSubmitting || !isFormValid}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
}

export default WOrderModifyComponent;
