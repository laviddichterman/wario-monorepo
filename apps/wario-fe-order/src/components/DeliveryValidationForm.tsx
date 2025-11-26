import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import Clear from '@mui/icons-material/Clear';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';

import { FormProvider, RHFTextField, } from '@wcp/wario-ux-shared/components';
import { SelectDeliveryAreaLink } from "@wcp/wario-ux-shared/redux";
import { ErrorResponseOutput, OkResponseOutput } from "@wcp/wario-ux-shared/styled";

import { deliveryAddressSchema, type DeliveryInfoFormData, setDeliveryInfo, validateDeliveryAddress } from '@/app/slices/WFulfillmentSlice';
import { useAppDispatch, useAppSelector } from '@/app/useHooks';



function useDeliveryInfoForm() {
  const useFormApi = useForm<DeliveryInfoFormData>({
    defaultValues: {
      address: useAppSelector(s => s.fulfillment.deliveryInfo?.address ?? ""),
      address2: useAppSelector(s => s.fulfillment.deliveryInfo?.address2 ?? ""),
      deliveryInstructions: useAppSelector(s => s.fulfillment.deliveryInfo?.deliveryInstructions ?? ""),
      zipcode: useAppSelector(s => s.fulfillment.deliveryInfo?.zipcode ?? ""),
    },
    resolver: zodResolver(deliveryAddressSchema),
    mode: 'onBlur'
  });

  return useFormApi;
}

export default function DeliveryInfoForm() {
  const dispatch = useAppDispatch();
  const DELIVERY_LINK = useAppSelector(SelectDeliveryAreaLink);
  const deliveryValidationLoading = useAppSelector(s => s.fulfillment.deliveryValidationStatus);

  const deliveryForm = useDeliveryInfoForm();
  const { handleSubmit, reset, formState: { isValid } } = deliveryForm;
  const validatedDeliveryAddress = useAppSelector(s => s.fulfillment.deliveryInfo?.address);
  const validatedDeliveryAddress2 = useAppSelector(s => s.fulfillment.deliveryInfo?.address2 ?? "");
  const validatedZipcode = useAppSelector(s => s.fulfillment.deliveryInfo?.zipcode);
  const resetValidatedAddress = () => {
    reset();
    dispatch(setDeliveryInfo(null));
  };

  const setDeliveryInfoAndAttemptToValidate = function (formData: DeliveryInfoFormData) {
    console.log(formData);
    if (isValid && deliveryValidationLoading !== 'PENDING') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      dispatch(validateDeliveryAddress(formData));
    }
  }

  return (
    <>
      <span className="flexbox">
        <span className="flexbox__item one-whole">Delivery Information:</span>
      </span>
      {deliveryValidationLoading === 'VALID' ?
        <OkResponseOutput>
          Found an address in our delivery area: <br />
          <span className="title cart">
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/restrict-template-expressions */}
            {`${validatedDeliveryAddress!}${validatedDeliveryAddress2 ? ` ${validatedDeliveryAddress2}` : ''}, ${validatedZipcode}`}
            <IconButton name="remove" onClick={resetValidatedAddress}><Clear /></IconButton>
          </span>
        </OkResponseOutput>
        :
        <FormProvider<DeliveryInfoFormData> methods={deliveryForm}>
          <span className="flexbox">
            <span className="flexbox__item one-half">
              <RHFTextField
                name="address"
                disabled={deliveryValidationLoading === 'PENDING'}
                autoComplete="shipping address-line1"
                label="Address:"
                placeholder={"Address"}
              />
            </span>
            <span className="flexbox__item one-quarter soft-half--sides">
              <RHFTextField
                name="address2"
                disabled={deliveryValidationLoading === 'PENDING'}
                autoComplete="shipping address-line2"
                label="Apt/Unit:"
              />
            </span>
            <span className="flexbox__item one-quarter">
              <RHFTextField
                name="zipcode"
                disabled={deliveryValidationLoading === 'PENDING'}
                autoComplete="shipping postal-code"
                label="ZIP Code:"
              />
            </span>
          </span>
        </FormProvider>
      }
      {deliveryValidationLoading === 'OUTSIDE_RANGE' &&
        <ErrorResponseOutput>
          The address {validatedDeliveryAddress} isn't in our <Link target="_blank" href={DELIVERY_LINK}>delivery area</Link>
        </ErrorResponseOutput>
      }
      {deliveryValidationLoading === 'INVALID' &&
        <ErrorResponseOutput>
          Unable to determine the specified address. Send us a text or email if you continue having issues.
        </ErrorResponseOutput>
      }

      <span className="flexbox">
        <span className="flexbox__item one-whole">
          <label htmlFor="delivery-instructions-text">
            <span className="delivery-instructions-text">Delivery Instructions (optional):</span>
          </label>
          <input type="text" id="delivery-instructions-text" name="delivery_instructions" size={40} />
        </span>
      </span>
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <Button type="submit" disabled={!isValid || deliveryValidationLoading === 'PENDING'} className="btn" onClick={() => handleSubmit((e) => { setDeliveryInfoAndAttemptToValidate(e); })()}>Validate Delivery Address</Button>
    </>
  )
}

