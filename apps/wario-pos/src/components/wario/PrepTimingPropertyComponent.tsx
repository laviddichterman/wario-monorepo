import { Grid } from '@mui/material';

import { type PrepTiming } from '@wcp/wario-shared';
import { type ValSetVal } from '@wcp/wario-ux-shared/common';

import { FloatNumericPropertyComponent } from './property-components/FloatNumericPropertyComponent';
import { IntNumericPropertyComponent } from './property-components/IntNumericPropertyComponent';

export type PrepTimingPropertyComponentProps = ValSetVal<PrepTiming> & {
  disabled: boolean;
};

const PrepTimingPropertyComponent = (props: PrepTimingPropertyComponentProps) => {
  const { value, setValue, disabled } = props;

  const updateField = <K extends keyof PrepTiming>(field: K, val: PrepTiming[K]) => {
    setValue({ ...value, [field]: val });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={6}>
        <IntNumericPropertyComponent
          min={0}
          disabled={disabled}
          label="Station ID"
          value={value.prepStationId}
          setValue={(x: number) => {
            updateField('prepStationId', x);
          }}
        />
      </Grid>
      <Grid size={6}>
        <FloatNumericPropertyComponent
          min={0.0}
          disabled={disabled}
          label="Prep Time"
          value={value.prepTime}
          setValue={(x: number) => {
            updateField('prepTime', x);
          }}
        />
      </Grid>

      <Grid size={12}>
        <FloatNumericPropertyComponent
          min={0.0}
          disabled={disabled}
          label="Additional Time Per Unit"
          value={value.additionalUnitPrepTime}
          setValue={(x: number) => {
            updateField('additionalUnitPrepTime', x);
          }}
        />
      </Grid>
    </Grid>
  );
};

export default PrepTimingPropertyComponent;
