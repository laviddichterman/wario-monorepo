import { type BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';

import { spreadSx } from '@/common/SxSpreadUtils';

export const LogoSVG = () => <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 305.95 352.1" fill='red'><g id="HATCH"><polygon points="152.98 0 185.34 120.3 305.95 88.02 217.7 176.05 305.95 264.07 185.34 231.8 152.98 352.1 120.62 231.8 0 264.07 88.26 176.05 0 88.02 120.62 120.3 152.98 0 152.98 0" /></g></svg>

export const Logo = function ({ sx, ...props }: BoxProps) {
  return <Box {...props} sx={[{ width: 40, height: 40 }, ...spreadSx(sx)]}>
    <LogoSVG />
  </Box>
}