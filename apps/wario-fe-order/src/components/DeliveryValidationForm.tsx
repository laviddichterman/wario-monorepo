import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import Clear from '@mui/icons-material/Clear';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';

import { FormProvider, RHFTextField, } from '@wcp/wario-ux-shared/components';
import { type DeliveryInfoFormData, useDeliveryAreaLink, useValidateDeliveryAddressMutation } from "@wcp/wario-ux-shared/query";
import { ErrorResponseOutput, OkResponseOutput } from "@wcp/wario-ux-shared/styled";

import axios from "@/utils/axios";

import { deliveryAddressSchema, useFulfillmentStore } from "@/stores/useFulfillmentStore";



function useDeliveryInfoForm() {
  const { deliveryInfo } = useFulfillmentStore();
  const useFormApi = useForm<DeliveryInfoFormData>({
    defaultValues: {
      address: deliveryInfo?.address ?? "",
      address2: deliveryInfo?.address2 ?? "",
      deliveryInstructions: deliveryInfo?.deliveryInstructions ?? "",
      zipcode: deliveryInfo?.zipcode ?? "",
    },
    resolver: zodResolver(deliveryAddressSchema),
    mode: 'onBlur'
  });

  return useFormApi;
}

export default function DeliveryInfoForm() {
  const validateDeliveryAddressMutation = useValidateDeliveryAddressMutation({ axiosInstance: axios });
  const { setDeliveryInfo, deliveryInfo } = useFulfillmentStore();
  const DELIVERY_LINK = useDeliveryAreaLink() as string;
  const deliveryForm = useDeliveryInfoForm();
  const { handleSubmit, reset, formState: { isValid } } = deliveryForm;
  const resetValidatedAddress = () => {
    reset();
    setDeliveryInfo(null);
  };

  const setDeliveryInfoAndAttemptToValidate = function (formData: DeliveryInfoFormData) {
    console.log(formData);
    if (isValid && validateDeliveryAddressMutation.isIdle) {
      validateDeliveryAddressMutation.mutate(formData, {
        onSuccess: (data) => {
          setDeliveryInfo(
            {
              address: formData.address,
              address2: formData.address2,
              zipcode: formData.zipcode,
              deliveryInstructions: formData.deliveryInstructions,
              validation: {

                address_components: data.address_components,
                found: data.found,
                in_area: data.in_area,
                validated_address: data.validated_address,
              }
            });
        },
        onError: (_error) => {
          setDeliveryInfo(null);
        }
      });
    }
  }

  return (
    <>
      <span className="flexbox">
        <span className="flexbox__item one-whole">Delivery Information:</span>
      </span>
      {validateDeliveryAddressMutation.isSuccess && validateDeliveryAddressMutation.data.in_area && deliveryInfo ?
        <OkResponseOutput>
          Found an address in our delivery area: <br />
          <span className="title cart">
            {`${deliveryInfo.address}${deliveryInfo.address2 ? ` ${deliveryInfo.address2}` : ''}, ${deliveryInfo.zipcode}`}
            <IconButton name="remove" onClick={resetValidatedAddress}><Clear /></IconButton>
          </span>
        </OkResponseOutput>
        :
        <FormProvider<DeliveryInfoFormData> methods={deliveryForm}>
          <span className="flexbox">
            <span className="flexbox__item one-half">
              <RHFTextField
                name="address"
                disabled={validateDeliveryAddressMutation.isPending}
                autoComplete="shipping address-line1"
                label="Address:"
                placeholder={"Address"}
              />
            </span>
            <span className="flexbox__item one-quarter soft-half--sides">
              <RHFTextField
                name="address2"
                disabled={validateDeliveryAddressMutation.isPending}
                autoComplete="shipping address-line2"
                label="Apt/Unit:"
              />
            </span>
            <span className="flexbox__item one-quarter">
              <RHFTextField
                name="zipcode"
                disabled={validateDeliveryAddressMutation.isPending}
                autoComplete="shipping postal-code"
                label="ZIP Code:"
              />
            </span>
          </span>
        </FormProvider>
      }
      {validateDeliveryAddressMutation.isSuccess && !validateDeliveryAddressMutation.data.in_area &&
        <ErrorResponseOutput>
          The address {validateDeliveryAddressMutation.data.validated_address} isn't in our <Link target="_blank" href={DELIVERY_LINK}>delivery area</Link>
        </ErrorResponseOutput>
      }
      {validateDeliveryAddressMutation.isError &&
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
      <Button type="submit" disabled={!isValid || validateDeliveryAddressMutation.isPending} className="btn" onClick={() => handleSubmit((e) => { setDeliveryInfoAndAttemptToValidate(e); })()}>Validate Delivery Address</Button>
    </>
  )
}

