import { Button, FormControlLabel, styled, ToggleButton, Typography } from '@mui/material';

export const OkResponseOutput = styled('div')(() => ({
  margin: '2em .5em 1em', padding: ".2em 1em", border: "2px solid blue"
}));

export const WarningResponseOutput: typeof OkResponseOutput = styled(OkResponseOutput)(() => ({
  borderColor: '#f7e700'
}));

export const ErrorResponseOutput = styled(OkResponseOutput)(() => ({
  borderColor: 'red'
}));

export const StepperTitle = styled(Typography)(() => ({
  fontFamily: 'Source Sans Pro',
  fontWeight: '500',
  fontSize: "1em",
}));

export const StageTitle = styled(Typography)(() => ({
  fontFamily: 'Source Sans Pro',
  letterSpacing: '.1em',
  fontWeight: '700',
  fontSize: "24px",
  margin: "15px 0",
  textTransform: 'uppercase'
}))

export const WarioButton = styled(Button)(() => ({
  backgroundColor: "#252525",
  color: '#fff',
  textTransform: 'uppercase',
  transition: 'all .15s',
  padding: "12px 30px",
  fontSize: "12px",
  lineHeight: 1,
  height: 36,
  letterSpacing: '.2em',
  borderRadius: '3px',
  fontWeight: 400,
}));

export const WarioToggleButton = styled(ToggleButton)(() => ({
  backgroundColor: "#252525",
  color: '#fff',
  textTransform: 'uppercase',
  transition: 'all .15s',
  padding: "12px 30px",
  fontSize: "12px",
  lineHeight: 1,
  letterSpacing: '.2em',
  borderRadius: '3px',
  fontWeight: 400,
}));

export const ProductAdornment = styled('span')(() => ({
  fontFamily: "Cabin",
  backgroundColor: "#c59d5f",
  color: "#ffffff",
  top: -18,
  zIndex: 1,
  fontSize: 10,
  textTransform: 'uppercase',
  position: "absolute",
  left: -10,
  padding: "0 18px",
  letterSpacing: ".25em"
}));

export const ProductTitle = styled('span')(() => ({
  fontWeight: '900',
  position: "relative",
  zIndex: 5,
  textAlign: 'left',
  fontFamily: 'Source Sans Pro',
  letterSpacing: "0.1em",
  textTransform: 'uppercase',
  fontSize: "1.1875rem",
  lineHeight: "1.27316"
}));

export const ProductDescription = styled('span')(() => ({
  fontFamily: "Cabin",
  letterSpacing: 'normal',
  margin: 0,
  position: 'relative',
  color: '#515150'
}))

export const ProductPrice = styled('span')(() => ({
  fontFamily: "Cabin",
  fontSize: '1.1875rem',
  lineHeight: 1.27316,
  fontWeight: 700,
}))

export const Dots = styled('span')(() => ({
  position: 'absolute',
  top: 17,
  left: 0,
  right: 0,
  zIndex: 1,
  margin: 0,
  border: 0,
  height: 3,
  display: 'block',
  backgroundImage: "radial-gradient(circle closest-side,currentColor 99%,transparent 1%)",
  backgroundPosition: 'bottom',
  backgroundSize: '6px 3px',
  backgroundRepeat: 'repeat-x'
}))

export const CustomizerFormControlLabel = styled(FormControlLabel)(() => ({
  marginLeft: 0
}));

export const Separator = styled('hr')(() => ({
  border: '0px solid #51515037',
  borderTopWidth: 2,
  color: "#515150",
  height: 0,
  boxSizing: 'content-box',
  margin: "10px 0",
  padding: 0
}))



//export const ProductAdornment

//export const ProductDisplay

// Dots
// Product Price
// product description
// button