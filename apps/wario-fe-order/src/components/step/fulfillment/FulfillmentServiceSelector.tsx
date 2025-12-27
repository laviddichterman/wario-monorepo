import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';

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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        width: '100%',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: 'Source Sans Pro',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          mb: 1.5,
          color: 'text.secondary',
        }}
      >
        Requested Service
      </Typography>
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
            sx={{ mr: 3 }}
          />
        ))}
      </RadioGroup>
    </Paper>
  );
}
