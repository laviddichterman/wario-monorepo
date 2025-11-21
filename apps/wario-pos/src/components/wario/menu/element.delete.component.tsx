import { type ReactNode } from "react";

import { Warning } from "@mui/icons-material";
import { Grid } from "@mui/material";

import { ElementActionComponent, type ElementActionComponentProps } from "./element.action.component";

const ElementDeleteComponent = ({
  name,
  additionalBody,
  onCloseCallback,
  onConfirmClick,
  isProcessing
}: { name: string, additionalBody?: ReactNode } & Pick<ElementActionComponentProps, 'onCloseCallback' | 'onConfirmClick' | 'isProcessing'>) => (
  <ElementActionComponent
    onCloseCallback={onCloseCallback}
    onConfirmClick={onConfirmClick}
    isProcessing={isProcessing}
    disableConfirmOn={isProcessing}
    confirmText="Confirm"
    body={
      <>
        <Grid size={12}>
          <Warning /> Are you sure you'd like to delete {name}? Note this cannot be undone.
        </Grid>
        {additionalBody}
      </>
    }
  />
);

export default ElementDeleteComponent;
