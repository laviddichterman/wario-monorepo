import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

interface FulfillmentServiceSelectorProps {
  options: { label: string; value: string; disabled?: boolean }[];
  selectedService: string | null;
  onServiceChange: (value: string) => void;
}

export default function FulfillmentServiceSelector({
  options,
  selectedService,
  onServiceChange,
}: FulfillmentServiceSelectorProps) {
  return (
    <Grid
      sx={{ pl: 3, pb: 5 }}
      size={{
        xs: 12,
        xl: 4,
      }}
    >
      <span>Requested Service:</span>
      <RadioGroup
        row
        onChange={(_e, value: string) => {
          onServiceChange(value);
        }}
        value={selectedService}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
            // passing the disabled prop gives react fragment warning
            // disabled={option.disabled}
          />
        ))}
      </RadioGroup>
    </Grid>
  );
}
