import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';

import { WDateUtils } from '@wcp/wario-shared';
import { Separator, StageTitle, WarningResponseOutput } from '@wcp/wario-ux-shared/styled';

import { usePropertyFromSelectedFulfillment, useSelectedServiceTimeDisplayString } from '@/hooks/useDerivedState';

import { useCustomerInfoStore } from '@/stores/useCustomerInfoStore';
import { selectServiceDateTime, useFulfillmentStore } from '@/stores/useFulfillmentStore';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useStepperStore } from '@/stores/useStepperStore';

import { Navigation } from '../Navigation';
import { WCheckoutCart } from '../WCheckoutCart';

const REQUEST_ANY =
  'By adding any special instructions, the cost of your order may increase and it will take longer. Please text the restaurant with your special request before making it here.';
const REQUEST_SOONER =
  "It looks like you're trying to ask us to make your pizza sooner. While we would love to do so, the times you were able to select represents our real-time availability. Please send us a text if you're looking for your pizza earlier and it's not a Friday, Saturday, or Sunday, otherwise, you'll need to remove this request to continue with your order.";
const REQUEST_RANCH = 'Please look at our menu before requesting ranch.';

const REQUEST_HALF = import.meta.env.MESSAGE_REQUEST_HALF;
const REQUEST_SLICING = import.meta.env.MESSAGE_REQUEST_SLICING;
const REQUEST_VEGAN = import.meta.env.MESSAGE_REQUEST_VEGAN;

export default function WReviewOrderStage() {
  const nextStage = useStepperStore((s) => s.nextStage);
  const backStage = useStepperStore((s) => s.backStage);
  // Use individual selectors to avoid creating new objects on every render
  const givenName = useCustomerInfoStore((s) => s.givenName);
  const familyName = useCustomerInfoStore((s) => s.familyName);
  const mobileNum = useCustomerInfoStore((s) => s.mobileNum);
  const email = useCustomerInfoStore((s) => s.email);
  // Use individual selectors to avoid creating new objects on every render
  const dineInInfo = useFulfillmentStore((s) => s.dineInInfo);
  const deliveryInfo = useFulfillmentStore((s) => s.deliveryInfo);
  const selectedServiceDisplayName = usePropertyFromSelectedFulfillment('displayName');
  const serviceTimeDisplayString = useSelectedServiceTimeDisplayString();
  const serviceDateTime = useFulfillmentStore(selectServiceDateTime);
  // Use individual selectors for payment store
  const specialInstructions = usePaymentStore((s) => s.specialInstructions);
  const acknowledgeInstructionsDialogue = usePaymentStore((s) => s.acknowledgeInstructionsDialogue);
  const setSpecialInstructions = usePaymentStore((s) => s.setSpecialInstructions);
  const setAcknowledgeInstructionsDialogue = usePaymentStore((s) => s.setAcknowledgeInstructionsDialogue);
  const [disableSubmit, setDisableSubmit] = useState(false); // switch to useMemo
  const [specialInstructionsResponses, setSpecialInstructionsResponses] = useState<{ level: number; text: string }[]>(
    [],
  );
  useEffect(() => {
    const special_instructions_responses = [];
    let disableorder = false;
    const lowered = specialInstructions ? specialInstructions.toLowerCase() : '';
    if (/*REQUEST_ANY && */ acknowledgeInstructionsDialogue) {
      special_instructions_responses.push({ level: 0, text: REQUEST_ANY });
    }
    if (
      REQUEST_HALF &&
      (lowered.indexOf('split') >= 0 || lowered.indexOf('half') >= 0 || lowered.indexOf('1/2') >= 0)
    ) {
      special_instructions_responses.push({ level: 0, text: REQUEST_HALF });
    }
    if (REQUEST_SLICING && (lowered.indexOf('slice') >= 0 || lowered.indexOf('cut') >= 0)) {
      disableorder = true;
      special_instructions_responses.push({ level: 1, text: REQUEST_SLICING });
    }
    if (
      /* REQUEST_SOONER && */ lowered.indexOf('soon') >= 0 ||
      lowered.indexOf('earl') >= 0 ||
      lowered.indexOf('time') >= 0 ||
      lowered.indexOf('asap') >= 0
    ) {
      disableorder = true;
      special_instructions_responses.push({ level: 1, text: REQUEST_SOONER });
    }
    if (/* REQUEST_RANCH && */ lowered.indexOf('ranch') >= 0) {
      disableorder = true;
      special_instructions_responses.push({ level: 1, text: REQUEST_RANCH });
    }
    if (
      REQUEST_VEGAN &&
      (lowered.indexOf('no cheese') >= 0 || lowered.indexOf('vegan') >= 0 || lowered.indexOf('without cheese') >= 0)
    ) {
      special_instructions_responses.push({ level: 0, text: REQUEST_VEGAN });
    }
    setDisableSubmit(disableorder);
    setSpecialInstructionsResponses(special_instructions_responses);
  }, [acknowledgeInstructionsDialogue, specialInstructions]);

  if (selectedServiceDisplayName === null || serviceDateTime === null) {
    return <div>You found a bug</div>;
  }
  return (
    <div>
      <StageTitle>Everything look right?</StageTitle>
      <Separator />
      <TableContainer component={Paper} sx={{ pb: 3 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>
                {givenName} {familyName}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mobile Number</TableCell>
              <TableCell>{mobileNum}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>E-Mail</TableCell>
              <TableCell>{email}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>
                {selectedServiceDisplayName} on {format(serviceDateTime, WDateUtils.ServiceDateDisplayFormat)} at{' '}
                {serviceTimeDisplayString}
              </TableCell>
            </TableRow>
            {dineInInfo && (
              <TableRow>
                <TableCell>Party Size</TableCell>
                <TableCell>{dineInInfo.partySize}</TableCell>
              </TableRow>
            )}
            {deliveryInfo && (
              <TableRow>
                <TableCell>Delivery Address</TableCell>
                <TableCell>
                  {deliveryInfo.address}
                  {deliveryInfo.address2 && ` ${deliveryInfo.address2}`}
                  {`, ${deliveryInfo.zipcode}`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <WCheckoutCart />
      <div>
        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledgeInstructionsDialogue}
              onChange={(_, checked) => {
                setAcknowledgeInstructionsDialogue(checked);
              }}
            />
          }
          label="I need to specify some special instructions (which may delay my order or change its cost) and I've already texted or emailed to ensure the request can be handled."
        />
        {acknowledgeInstructionsDialogue ? (
          <TextField
            fullWidth
            multiline
            value={specialInstructions || ''}
            onChange={(e) => {
              setSpecialInstructions(e.target.value);
            }}
          />
        ) : (
          ''
        )}
      </div>
      {specialInstructionsResponses.map((res, i) => (
        <WarningResponseOutput key={i}>{res.text}</WarningResponseOutput>
      ))}
      <Navigation canBack canNext={!disableSubmit} handleBack={backStage} handleNext={nextStage} />
    </div>
  );
}
