import { useMemo, useState } from 'react';

import Done from '@mui/icons-material/Done';
import Error from '@mui/icons-material/Error';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import { CREDIT_REGEX } from '@wcp/wario-shared';
import { StoreCreditInputComponent } from '@wcp/wario-ux-shared/components';
import { useValidateStoreCreditMutation } from '@wcp/wario-ux-shared/query';
import { ErrorResponseOutput } from '@wcp/wario-ux-shared/styled';

import axiosInstance from '@/utils/axios';

import { usePaymentStore } from '@/stores/usePaymentStore';



export function StoreCreditSection() {
  const {
    storeCreditInput,
    clearCreditCode,
    setStoreCreditValidation,
    setStoreCreditInput,
    storeCreditValidations
  } = usePaymentStore();

  const validateCreditMutation = useValidateStoreCreditMutation({ axiosInstance });

  const [useCreditCheckbox, setUseCreditCheckbox] = useState<boolean>(validateCreditMutation.isSuccess);
  const [localCreditCode, setLocalCreditCode] = useState<string>(storeCreditInput);
  const isCreditValidated = useMemo(() => validateCreditMutation.isSuccess && storeCreditValidations.length > 0, [validateCreditMutation.isSuccess, storeCreditValidations]);
  const isCreditInvalid = useMemo(() => validateCreditMutation.isError || (validateCreditMutation.isSuccess && storeCreditValidations.length === 0), [validateCreditMutation.isError, validateCreditMutation.isSuccess, storeCreditValidations]);
  const setLocalCreditCodeAndAttemptToValidate = function (code: string) {
    setLocalCreditCode(code);
    if (!validateCreditMutation.isPending && !validateCreditMutation.isSuccess && code.length === 19 && CREDIT_REGEX.test(code)) {
      setStoreCreditInput(code);
      validateCreditMutation.mutate(code, {
        onSuccess: (data) => {
          if (data.valid) {
            setStoreCreditValidation(code, data);
          }
        },
        onError: () => {
        },
      });
    }
  };

  const handleSetUseCreditCheckbox = (checked: boolean) => {
    if (!checked) {
      clearCreditCode();
      setLocalCreditCode('');
      validateCreditMutation.reset();
    }
    setUseCreditCheckbox(checked);
  };
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
            endAdornment={isCreditInvalid ? <Error /> : (isCreditValidated ? <Done /> : undefined)}
            name="Credit Code"
            label="Code:"
            id="store_credit_code"
            disabled={isCreditValidated || validateCreditMutation.isPending}
            value={localCreditCode}
            onChange={(e: { target: { value: string } }) => { setLocalCreditCodeAndAttemptToValidate(e.target.value) }}
          />
        </Grid>}
      {isCreditValidated &&
        <Grid size={12}>
          <ErrorResponseOutput>Code entered looks to be invalid. Please check your input and try again. Please copy/paste from the e-mail you received. Credit codes are case sensitive.</ErrorResponseOutput>
        </Grid>}
    </Grid>
  );
}