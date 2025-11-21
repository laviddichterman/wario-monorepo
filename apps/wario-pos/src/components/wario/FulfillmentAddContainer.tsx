import { useAuth0 } from '@auth0/auth0-react';
import type { Polygon } from 'geojson';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { type DateIntervalsEntries, DayOfTheWeek, type FulfillmentConfig, FulfillmentType, type OperatingHourSpecification } from "@wcp/wario-shared";

import { HOST_API } from "../../config";

import FulfillmentComponent from "./FulfillmentComponent";
const EmptyOperatingHours: OperatingHourSpecification = {
  [DayOfTheWeek.SUNDAY]: [],
  [DayOfTheWeek.MONDAY]: [],
  [DayOfTheWeek.TUESDAY]: [],
  [DayOfTheWeek.WEDNESDAY]: [],
  [DayOfTheWeek.THURSDAY]: [],
  [DayOfTheWeek.FRIDAY]: [],
  [DayOfTheWeek.SATURDAY]: []
};

const FulfillmentAddContainer = ({ onCloseCallback }: { onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [ordinal, setOrdinal] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [shortcode, setShortcode] = useState('');
  const [exposeFulfillment, setExposeFulfillment] = useState(true);
  const [service, setService] = useState(FulfillmentType.PickUp);
  const [terms, setTerms] = useState<string[]>([]);
  const [fulfillmentDescription, setFulfillmentDescription] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  const [orderCategoryId, setOrderCategoryId] = useState<string | null>(null);
  const [orderSupplementaryCategoryId, setOrderSupplementaryCategoryId] = useState<string | null>(null);
  const [requirePrepayment, setRequirePrepayment] = useState(true);
  const [allowPrepayment, setAllowPrepayment] = useState(true);
  const [allowTipping, setAllowTipping] = useState(true);
  const [autograt, setAutograt] = useState<{ function: string, percentage: number } | null>(null);
  const [serviceChargeFunctionId, setServiceChargeFunctionId] = useState<string | null>(null);
  const [leadTime, setLeadTime] = useState(35);
  const [leadTimeOffset, setLeadTimeOffset] = useState(0);
  const [operatingHours, setOperatingHours] = useState({ ...EmptyOperatingHours });
  const [blockedOff, setBlockedOff] = useState<DateIntervalsEntries>([]);
  const [specialHours, setSpecialHours] = useState<DateIntervalsEntries>([]);

  const [minDuration, setMinDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  const [timeStep, setTimeStep] = useState(15);
  const [maxGuests, setMaxGuests] = useState<number | null>(null);
  const [serviceArea, setServiceArea] = useState<Polygon | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const reset = () => {
    setOrdinal(0);
    setDisplayName('');
    setShortcode('');
    setExposeFulfillment(true);
    setService(FulfillmentType.PickUp);
    setTerms([]);
    setFulfillmentDescription('');
    setConfirmationMessage('');
    setInstructions('');
    setMenuCategoryId(null);
    setOrderCategoryId(null);
    setOrderSupplementaryCategoryId(null);
    setRequirePrepayment(true);
    setAllowPrepayment(true);
    setAutograt(null);
    setServiceChargeFunctionId(null);
    setLeadTime(35);
    setLeadTimeOffset(0);
    setOperatingHours(EmptyOperatingHours);
    setMinDuration(0);
    setMaxDuration(0);
    setTimeStep(15);
    setMaxGuests(null);
    setServiceArea(null);
  }

  const canSubmit = !isProcessing && menuCategoryId !== null && orderCategoryId !== null && ((confirmationMessage.length > 0 && instructions.length > 0) || !exposeFulfillment);

  const addFulfillment = async () => {
    if (canSubmit) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<FulfillmentConfig, "id"> = {
          displayName,
          exposeFulfillment,
          shortcode,
          ordinal,
          service,
          terms: terms.filter(x => x.length > 0),
          messages: {
            DESCRIPTION: fulfillmentDescription ?? null,
            CONFIRMATION: confirmationMessage,
            INSTRUCTIONS: instructions,
          },
          menuBaseCategoryId: menuCategoryId,
          orderBaseCategoryId: orderCategoryId,
          orderSupplementaryCategoryId: orderSupplementaryCategoryId,
          requirePrepayment,
          allowPrepayment,
          allowTipping,
          autograt,
          serviceCharge: serviceChargeFunctionId,
          leadTime,
          leadTimeOffset,
          operatingHours,
          specialHours: [],
          blockedOff: [],
          minDuration,
          maxDuration,
          timeStep,
          maxGuests: maxGuests ?? undefined,
          serviceArea: serviceArea ?? undefined

        };
        const response = await fetch(`${HOST_API}/api/v1/config/fulfillment/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added new fulfillment: ${displayName}.`);
          reset();
          onCloseCallback();
        }
        setIsProcessing(false);

      } catch (error) {
        enqueueSnackbar(`Unable to add fulfillment: ${displayName}. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <FulfillmentComponent
      shortcode={shortcode}
      setShortcode={setShortcode}
      exposeFulfillment={exposeFulfillment}
      setExposeFulfillment={setExposeFulfillment}
      displayName={displayName}
      setDisplayName={setDisplayName}
      ordinal={ordinal}
      setOrdinal={setOrdinal}
      service={service}
      setService={setService}
      terms={terms}
      setTerms={setTerms}
      fulfillmentDescription={fulfillmentDescription}
      setFulfillmentDescription={setFulfillmentDescription}
      confirmationMessage={confirmationMessage}
      setConfirmationMessage={setConfirmationMessage}
      instructions={instructions}
      setInstructions={setInstructions}
      menuCategoryId={menuCategoryId}
      setMenuCategoryId={setMenuCategoryId}
      orderCategoryId={orderCategoryId}
      setOrderCategoryId={setOrderCategoryId}
      orderSupplementaryCategoryId={orderSupplementaryCategoryId}
      setOrderSupplementaryCategoryId={setOrderSupplementaryCategoryId}
      requirePrepayment={requirePrepayment}
      setRequirePrepayment={setRequirePrepayment}
      allowPrepayment={allowPrepayment}
      setAllowPrepayment={setAllowPrepayment}
      allowTipping={allowTipping}
      setAllowTipping={setAllowTipping}
      autograt={autograt}
      setAutograt={setAutograt}
      serviceChargeFunctionId={serviceChargeFunctionId}
      setServiceChargeFunctionId={setServiceChargeFunctionId}
      leadTime={leadTime}
      setLeadTime={setLeadTime}
      operatingHours={operatingHours}
      setOperatingHours={setOperatingHours}
      minDuration={minDuration}
      setMinDuration={setMinDuration}
      maxDuration={maxDuration}
      setMaxDuration={setMaxDuration}
      timeStep={timeStep}
      setTimeStep={setTimeStep}
      maxGuests={maxGuests}
      setMaxGuests={setMaxGuests}
      serviceArea={serviceArea}
      setServiceArea={setServiceArea}
      specialHours={specialHours}
      setSpecialHours={setSpecialHours}
      blockedOff={blockedOff}
      setBlockedOff={setBlockedOff}
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addFulfillment}
      isProcessing={isProcessing}
      disableConfirmOn={!canSubmit}
    />
  );
};

export default FulfillmentAddContainer;
