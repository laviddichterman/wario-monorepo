import { Clear } from '@mui/icons-material';
import { Button, IconButton, Link } from '@mui/material';
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAppDispatch, useAppSelector } from '../app/useHooks';
import { FormProvider, RHFTextField } from './hook-form';

import { type DeliveryInfoFormData, deliveryAddressSchema, setDeliveryInfo, validateDeliveryAddress } from '../app/slices/WFulfillmentSlice';
import { ErrorResponseOutput, OkResponseOutput, SelectDeliveryAreaLink } from '@wcp/wario-ux-shared';


function useDeliveryInfoForm() {
  const preExisitingDeliveryInfo = useAppSelector(s => s.fulfillment.deliveryInfo);
  const useFormApi = useForm<DeliveryInfoFormData>({
    defaultValues: {
      address: preExisitingDeliveryInfo?.address ?? "",
      address2: preExisitingDeliveryInfo?.address2 ?? "",
      deliveryInstructions: preExisitingDeliveryInfo?.deliveryInstructions ?? "",
      zipcode: preExisitingDeliveryInfo?.zipcode ?? ""
    },
    resolver: yupResolver(deliveryAddressSchema),
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
            {`${validatedDeliveryAddress}${validatedDeliveryAddress2 ? ` ${validatedDeliveryAddress2}` : ''}, ${validatedZipcode}`}
            <IconButton name="remove" onClick={resetValidatedAddress}><Clear /></IconButton>
          </span>
        </OkResponseOutput>
        :
        <FormProvider methods={deliveryForm}>
          <span className="flexbox">
            <span className="flexbox__item one-half">
              <RHFTextField
                name="address"
                readOnly={deliveryValidationLoading === 'PENDING'}
                autoComplete="shipping address-line1"
                label="Address:"
                placeholder={"Address"}
              />
            </span>
            <span className="flexbox__item one-quarter soft-half--sides">
              <RHFTextField
                name="address2"
                readOnly={deliveryValidationLoading === 'PENDING'}
                autoComplete="shipping address-line2"
                label="Apt/Unit:"
              />
            </span>
            <span className="flexbox__item one-quarter">
              <RHFTextField
                name="zipcode"
                readOnly={deliveryValidationLoading === 'PENDING'}
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
      <Button type="submit" disabled={!isValid || deliveryValidationLoading === 'PENDING'} className="btn" onClick={() => handleSubmit((e) => setDeliveryInfoAndAttemptToValidate(e))()}>Validate Delivery Address</Button>
    </>
  )
}

