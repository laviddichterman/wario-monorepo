import { Logo } from './Logo';

import { FullScreenPulsingContainer } from '../containers/FullScreenPulsingContainer';

export const LoadingScreen = () => <FullScreenPulsingContainer children={<Logo sx={{ width: 64, height: 64 }} />} />
