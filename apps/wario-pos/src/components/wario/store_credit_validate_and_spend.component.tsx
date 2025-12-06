import { uniqueId } from 'es-toolkit/compat';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import type { Html5QrcodeResult, QrcodeErrorCallback, QrcodeSuccessCallback } from 'html5-qrcode/core';
import { useSnackbar } from 'notistack';
import { useEffect, useLayoutEffect, useState } from 'react';

import { ErrorOutline, PhotoCamera } from "@mui/icons-material";
import { Button, Card, CardHeader, Divider, Grid, IconButton, List, ListItem, Typography } from '@mui/material';

import type { IMoney, SpendCreditResponse, ValidateAndLockCreditResponse, ValidateLockAndSpendRequest } from '@wcp/wario-shared';
import { CURRENCY, MoneyToDisplayString, StoreCreditType } from '@wcp/wario-shared';
import { DialogContainer } from "@wcp/wario-ux-shared/containers";

import { HOST_API } from "@/config";

import { IMoneyPropertyComponent } from './property-components/IMoneyPropertyComponent';
import { StringPropertyComponent } from './property-components/StringPropertyComponent';


interface QrCodeScannerProps {
  show: boolean;
  onSuccess: QrcodeSuccessCallback;
  onFailure: QrcodeErrorCallback;
}
const QrCodeId = uniqueId("qr_code");
const QrCodeScanner = ({ show, onSuccess, onFailure }: QrCodeScannerProps) => {
  const [qrScanner, setQrScanner] = useState<Html5QrcodeScanner | null>(null)
  useLayoutEffect(() => {
    if (!qrScanner) {
      setQrScanner(new Html5QrcodeScanner(
        QrCodeId, { supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], fps: 10 }, false));
    }
    return () => {
      if (qrScanner) {
        qrScanner.clear().catch((error: unknown) => {
          console.error("Failed to clear html5QrcodeScanner.", error);
        });
      }
    };
  }, [qrScanner]);
  useEffect(() => {
    if (show && qrScanner) {
      qrScanner.render(onSuccess, onFailure)
    } else {
      if (qrScanner) {
        qrScanner.pause();
      }
    }
  }, [show, qrScanner, onSuccess, onFailure])
  return (<div id={QrCodeId} />);
}

const StoreCreditValidateAndSpendComponent = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [creditCode, setCreditCode] = useState("");
  const [scanCode, setScanCode] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [validationResponse, setValidationResponse] = useState<ValidateAndLockCreditResponse | null>(null);
  const [amount, setAmount] = useState<IMoney>({ currency: CURRENCY.USD, amount: 0 });
  const [processedBy, setProcessedBy] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [debitResponse, setDebitResponse] = useState<SpendCreditResponse | null>(null);

  useEffect(() => {
    const CheckForCamera = async () => {
      const cam = await Html5Qrcode.getCameras();
      setHasCamera(cam.length > 0);
    };
    void CheckForCamera();
  }, []);

  const onScanned = async (qrCode: string) => {
    setCreditCode(qrCode);
    setScanCode(false);
    if (qrCode.length === 19) {
      await validateCode(qrCode);
    }
  };

  const onScannedFail = (errorMessage: string) => {
    console.log(errorMessage);
  }

  const clearLookup = () => {
    setIsProcessing(true);
    setCreditCode("");
    setScanCode(false);
    setValidationResponse(null);
    setAmount({ currency: CURRENCY.USD, amount: 0 });
    setProcessedBy("");
    setIsProcessing(false);
    setDebitResponse(null);
  };
  const validateCode = async (code: string) => {
    if (!isProcessing) {
      setValidationResponse(null);
      setIsProcessing(true);
      try {
        const response = await fetch(
          `${HOST_API}/api/v1/payments/storecredit/validate/?code=${encodeURIComponent(
            code
          )}`,
          { method: "GET" }
        );
        const response_data = await response.json() as ValidateAndLockCreditResponse;
        setValidationResponse(response_data);
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to validate ${creditCode}. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  const processDebit = async () => {
    if (!isProcessing && validationResponse !== null && validationResponse.valid) {
      setIsProcessing(true);
      try {
        const body: ValidateLockAndSpendRequest = {
          code: creditCode,
          amount,
          lock: validationResponse.lock,
          updatedBy: processedBy,
        };
        const response = await fetch(
          `${HOST_API}/api/v1/payments/storecredit/spend`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        )
        const response_data = await response.json() as SpendCreditResponse;
        setDebitResponse(response_data);
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to debit ${creditCode}. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };
  const scanHTML = hasCamera ? (<>
    <DialogContainer
      title="Scan Store Credit Code"
      onClose={() => {
        setScanCode(false);
      }}
      open={scanCode}
      innerComponent={
        <QrCodeScanner show={scanCode} onSuccess={(decodedText: string, _result: Html5QrcodeResult) => void onScanned(decodedText)} onFailure={onScannedFail} />
      }
    />
    <Grid
      size={{
        xs: 2,
        md: 1
      }}>
      <IconButton
        color="primary"
        component="span"
        onClick={() => { setScanCode(true); }}
        disabled={isProcessing || (validationResponse !== null && validationResponse.valid)}
        size="large">
        <PhotoCamera />
      </IconButton>
    </Grid></>) : "";

  return (
    <Card>
      <CardHeader title="Redeem Store Credit" subheader="Tool to debit store credit with instructions" />
      <Divider sx={{ my: 2 }} />
      <Grid container padding={2} spacing={2} justifyContent="center" alignItems="center">
        <Grid
          size={{
            xs: hasCamera ? 10 : 12,
            md: hasCamera ? 8 : 9
          }}>
          <StringPropertyComponent
            disabled={isProcessing || (validationResponse !== null && validationResponse.valid)}
            label="Credit Code"
            value={creditCode}
            setValue={setCreditCode}
          />
        </Grid>
        {scanHTML}
        <Grid
          size={{
            xs: 12,
            md: 3
          }}>
          {validationResponse !== null ? (
            <Button fullWidth onClick={clearLookup} disabled={isProcessing}>
              Clear
            </Button>
          ) : (
            <Button fullWidth onClick={() => void validateCode(creditCode)} disabled={isProcessing || creditCode.length !== 19}>
              Validate
            </Button>
          )}
        </Grid>

        {validationResponse !== null ? (
          !validationResponse.valid ?
            (<Grid size={12}>
              <ErrorOutline />
              FAILED TO FIND
              <ErrorOutline />
              <br />
              This generally means the code was mis-entered, has expired, or was already redeemed.
            </Grid>) : (
              <>
                <Grid size={12}>
                  <Typography variant="h5">
                    Found a credit code of type {validationResponse.credit_type}{" "}
                    with balance{" "}
                    {MoneyToDisplayString(validationResponse.amount, true)}
                  </Typography>
                  {validationResponse.credit_type === StoreCreditType.MONEY ? (
                    <List>
                      <ListItem>
                        Redeem this credit against the AFTER-TAX total of the
                        order.
                      </ListItem>
                      <ListItem>
                        If the after-tax total of the order is less than{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)},
                        ask the customer how much of their credit they would like
                        to apply as tip. Enter the sum of their after-tax total
                        and the applied tip below to debit the credit code. Apply
                        their after-tax total to the order on the POS as store
                        credit. Enter the tip into the tip log spreadsheet under
                        "In person GC redeem"
                      </ListItem>
                      <ListItem>
                        If the after-tax total of the order is greater than{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)},
                        split the order into two payments: the first for{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)}{" "}
                        paid with store credit, and the second for the remainder.
                        Enter{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)}{" "}
                        below to debit the full amount of the credit.
                      </ListItem>
                    </List>
                  ) : (
                    <List>
                      <ListItem>
                        Before closing, we need to apply a discount to the order.
                      </ListItem>
                      <ListItem>
                        So, if the pre-tax total of the order is less than{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)},
                        enter the pre-tax total below to debit that amount.
                      </ListItem>
                      <ListItem>
                        If the pre-tax total of the order is greater than or equal
                        to {MoneyToDisplayString(validationResponse.amount, true)},
                        enter{" "}
                        {MoneyToDisplayString(validationResponse.amount, true)}{" "}
                        below.
                      </ListItem>
                      <ListItem>
                        Apply the debited amount to the order as a discount.
                      </ListItem>
                    </List>
                  )}
                </Grid>
                <Grid size={6}>
                  <IMoneyPropertyComponent
                    disabled={isProcessing || debitResponse !== null}
                    label="Amount to debit"
                    min={0.01}
                    max={validationResponse.amount.amount / 100}
                    value={amount}
                    setValue={setAmount}
                  />
                </Grid>
                <Grid size={6}>
                  <StringPropertyComponent
                    disabled={isProcessing || debitResponse !== null}
                    label="Debited by"
                    value={processedBy}
                    setValue={setProcessedBy}
                  />
                </Grid>
                <Grid size={12}>
                  <Button
                    onClick={() => void processDebit()}
                    disabled={
                      isProcessing ||
                      debitResponse !== null ||
                      processedBy.length === 0 ||
                      amount.amount <= 0
                    }
                  >
                    Debit {MoneyToDisplayString(amount, true)}
                  </Button>
                </Grid>
              </>
            )) : ("")}
        {debitResponse !== null ? (
          debitResponse.success ? (
            <Grid size={12}>
              Successfully debited {MoneyToDisplayString(amount, true)}.
              Balance remaining:{" "}
              {MoneyToDisplayString(debitResponse.balance, true)}
            </Grid>
          ) : (
            <Grid size={12}>
              <ErrorOutline />
              FAILED TO DEBIT
              <ErrorOutline />
              <br />
              This generally means there was some shenannigans.
            </Grid>
          )
        ) : ("")}
      </Grid>
    </Card>
  );
};

export default StoreCreditValidateAndSpendComponent;