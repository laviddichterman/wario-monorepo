import { LicenseInfo } from '@mui/x-license/utils';

export const HOST_API = String(import.meta.env.VITE_HOST_API_KEY || '');

export const SOCKETIO = {
  ns: import.meta.env.VITE_SOCKETIO_NS as string,
}

export const IS_PRODUCTION = import.meta.env.MODE === 'production';

LicenseInfo.setLicenseKey(String(import.meta.env.VITE_MUI_KEY));
