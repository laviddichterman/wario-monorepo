import { useState } from 'react';

import { Grid } from "@mui/material";

import { type PrepTiming } from "@wcp/wario-shared";
import { type ValSetVal } from "@wcp/wario-ux-shared/common";

import { FloatNumericPropertyComponent } from './property-components/FloatNumericPropertyComponent';
import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';
import { ToggleBooleanPropertyComponent } from "./property-components/ToggleBooleanPropertyComponent";

export type PrepTimingPropertyComponentProps =
  ValSetVal<PrepTiming | null> & {
    disabled: boolean;
  };


const PrepTimingPropertyComponent = (props: PrepTimingPropertyComponentProps) => {
  const [specifyTiming, setSpecifyTiming] = useState(props.value !== null);
  const handleSpecifyTiming = (specify: boolean) => {
    if (specify) {
      setSpecifyTiming(true);
      props.setValue({ additionalUnitPrepTime: 5, prepStationId: 0, prepTime: 10 });
    } else {
      setSpecifyTiming(false);
      props.setValue(null);
    }
  }
  return (
    <Grid container spacing={2}>
      <Grid size={specifyTiming ? 6 : 12}>
        <ToggleBooleanPropertyComponent
          disabled={props.disabled}
          label="Specify Prep Timing"
          value={specifyTiming}
          setValue={handleSpecifyTiming}
        />
      </Grid>
      {specifyTiming && props.value && (
        <>
          <Grid size={6}>
            <IntNumericPropertyComponent
              min={0}
              disabled={props.disabled}
              label="Station ID"
              value={props.value.prepStationId}
              setValue={(x: number) => { props.setValue(props.value ? { ...props.value, prepStationId: x } : null) }}
            />
          </Grid>
          <Grid size={6}>
            <FloatNumericPropertyComponent
              min={0.0}
              disabled={props.disabled}
              label="Prep Time"
              value={props.value.prepTime}
              setValue={(x: number) => { props.setValue(props.value ? { ...props.value, prepTime: x } : null) }}
            />
          </Grid>

          <Grid size={6}>
            <FloatNumericPropertyComponent
              min={0.0}
              disabled={props.disabled}
              label="Additional Time Per Unit"
              value={props.value.additionalUnitPrepTime}
              setValue={(x: number) => { props.setValue(props.value ? { ...props.value, additionalUnitPrepTime: x } : null) }}
            />
          </Grid>

        </>
      )}
    </Grid>
  );
};

export default PrepTimingPropertyComponent;
