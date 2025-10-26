import { useState } from 'react';

import { Done, Error } from '@mui/icons-material';
import { Checkbox, FormControlLabel, Grid } from '@mui/material';

import { CREDIT_REGEX } from '@wcp/wario-shared';
import { ErrorResponseOutput, StoreCreditInputComponent } from '@wcp/wario-ux-shared';

import { clearCreditCode, validateStoreCredit } from '../app/slices/WPaymentSlice';
import { useAppDispatch, useAppSelector } from '../app/useHooks';



export function StoreCreditSection() {
  const dispatch = useAppDispatch();
  const creditValidationLoading = useAppSelector(s => s.payment.creditValidationLoading);
  const [useCreditCheckbox, setUseCreditCheckbox] = useState<boolean>(creditValidationLoading === 'SUCCEEDED');
  const storeCreditInput = useAppSelector(s => s.payment.storeCreditInput);
  const [localCreditCode, setLocalCreditCode] = useState<string>(storeCreditInput);
  const setLocalCreditCodeAndAttemptToValidate = function (code: string) {
    setLocalCreditCode(code);
    if (creditValidationLoading !== 'PENDING' && creditValidationLoading !== 'SUCCEEDED' && code.length === 19 && CREDIT_REGEX.test(code)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      dispatch(validateStoreCredit(code))
    }
  }
  const handleSetUseCreditCheckbox = (checked: boolean) => {
    if (!checked) {
      dispatch(clearCreditCode());
      setLocalCreditCode("");
    }
    setUseCreditCheckbox(checked);
  }
  return (
    <Grid container alignContent={'center'}>
      <Grid
        sx={{ pt: 2 }}
        size={{
          xs: 12,
          sm: useCreditCheckbox ? 6 : 12
        }}>
        <FormControlLabel
          control={<Checkbox checked={useCreditCheckbox} onChange={(e) => { handleSetUseCreditCheckbox(e.target.checked) }} />}
          label="Use Digital Gift Card / Store Credit"
        />
      </Grid>
      {useCreditCheckbox &&
        <Grid
          sx={{ px: 2 }}
          container
          size={{
            xs: 12,
            sm: 6
          }}>
          <StoreCreditInputComponent
            autoFocus
            endAdornment={creditValidationLoading === "FAILED" ? <Error /> : (creditValidationLoading === "SUCCEEDED" ? <Done /> : undefined)}
            name="Credit Code"
            label="Code:"
            id="store_credit_code"
            disabled={creditValidationLoading === 'SUCCEEDED' || creditValidationLoading === 'PENDING'}
            value={localCreditCode}
            onChange={(e: { target: { value: string } }) => { setLocalCreditCodeAndAttemptToValidate(e.target.value) }}
          />
        </Grid>}
      {creditValidationLoading === "FAILED" &&
        <Grid size={12}>
          <ErrorResponseOutput>Code entered looks to be invalid. Please check your input and try again. Please copy/paste from the e-mail you received. Credit codes are case sensitive.</ErrorResponseOutput>
        </Grid>}
    </Grid>
  );
}