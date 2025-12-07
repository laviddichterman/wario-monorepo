import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import { usePropertyFromSelectedFulfillment } from '@/hooks/useDerivedState';

import { useFulfillmentStore } from '@/stores/useFulfillmentStore';

export default function FulfillmentTerms() {
  const terms = usePropertyFromSelectedFulfillment('terms') ?? [];
  const hasAgreed = useFulfillmentStore((s) => s.hasAgreedToTerms);
  const setHasAgreedToTerms = useFulfillmentStore((s) => s.setHasAgreedToTerms);

  if (terms.length === 0) {
    return null;
  }

  return (
    <Grid
      size={{
        xs: 12,
        xl: 8,
      }}
    >
      <FormControlLabel
        control={
          <>
            <Checkbox
              checked={hasAgreed}
              onChange={(_, checked) => {
                setHasAgreedToTerms(checked);
              }}
            />
          </>
        }
        label={
          <>
            REQUIRED: Please read the following! By selecting the checkbox, you and all members of your party understand
            and agree to:
            <ul>
              {terms.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ul>
          </>
        }
      />
    </Grid>
  );
}
