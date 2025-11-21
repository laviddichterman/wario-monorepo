import React from "react";

import { Box, Button, DialogActions, DialogContent, Grid, LinearProgress } from '@mui/material';

const GenerateActionsHtmlFromList = (actions: React.ReactNode[]) => actions.length === 0 ? "" :
  (<Grid container justifyContent="flex-end" size={12}>
    {actions.map((action, idx) => (
      <Grid key={idx}>
        {action}
      </Grid>
    ))}
  </Grid>)

export interface ElementActionComponentProps {
  onCloseCallback: React.MouseEventHandler<HTMLButtonElement> | null;
  onConfirmClick: React.MouseEventHandler<HTMLButtonElement>;
  isProcessing: boolean;
  disableConfirmOn: boolean;
  confirmText: string;
  body: React.ReactNode;
}
const ElementActionComponent = ({
  body,
  onCloseCallback,
  onConfirmClick,
  isProcessing,
  disableConfirmOn,
  confirmText
}: ElementActionComponentProps) => {

  const actions_html = GenerateActionsHtmlFromList([
    onCloseCallback !== null && <Button
      onClick={onCloseCallback}
      disabled={isProcessing}>
      Cancel
    </Button>,
    <Button
      onClick={onConfirmClick}
      disabled={isProcessing || disableConfirmOn}>
      {confirmText}
    </Button>
  ]);

  return (
    <Box>
      <DialogContent>
        <Grid container rowSpacing={2} spacing={2} justifyContent="center">
          {body}
        </Grid>
      </DialogContent>
      <DialogActions>
        {actions_html}
        {isProcessing ? <LinearProgress /> : ""}
      </DialogActions>
    </Box>
  );
};

export { ElementActionComponent, GenerateActionsHtmlFromList };
