import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        borderLeft: '4px solid #c59d5f',
        width: '100%',
        backgroundColor: 'rgba(197, 157, 95, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
        <WarningAmberIcon sx={{ color: '#c59d5f', fontSize: 24, mt: 0.25 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: 'Source Sans Pro',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          Required: Please read and agree
        </Typography>
      </Box>
      <Box
        component="ul"
        sx={{
          m: 0,
          pl: 2.5,
          mb: 2,
          '& li': {
            mb: 0.75,
            lineHeight: 1.5,
          },
        }}
      >
        {terms.map((term, i) => (
          <li key={i}>
            <Typography variant="body2" component="span">
              {term}
            </Typography>
          </li>
        ))}
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={hasAgreed}
            onChange={(_, checked) => {
              setHasAgreedToTerms(checked);
            }}
            sx={{
              color: '#c59d5f',
              '&.Mui-checked': {
                color: '#c59d5f',
              },
            }}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            I have read and agree to the above terms
          </Typography>
        }
        sx={{ ml: 0 }}
      />
    </Paper>
  );
}
