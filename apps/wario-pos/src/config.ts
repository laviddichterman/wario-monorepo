import { LicenseInfo } from '@mui/x-license/utils';

import { paths } from '@/routes/paths';
// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  auth: {
    method: 'auth0';
    skip: boolean;
    redirectPath: string;
  };
  auth0: {
    clientId: string;
    domain: string;
    callbackUrl: string;
    audience: string;
    scope?: string;
  };
};



export const HOST_API = import.meta.env.VITE_HOST_API_KEY || '';

export const SOCKETIO = {
  ns: import.meta.env.VITE_SOCKETIO_NS,
}

LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_KEY);


// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Minimal UI',
  appVersion: __APP_VERSION__,
  serverUrl: import.meta.env.VITE_HOST_API_KEY,
  assetsDir: import.meta.env.VITE_ASSETS_DIR,
  /**
   * Auth
   * @method auth0
   */
  auth: {
    method: 'auth0',
    skip: false,
    redirectPath: paths.dashboard.root,
  },
  /**
   * Auth0
   */
  auth0: {
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    callbackUrl: window.location.origin, // import.meta.env.VITE_AUTH0_CALLBACK_URL,
    scope: import.meta.env.VITE_AUTH0_SCOPE,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE
  },
};


