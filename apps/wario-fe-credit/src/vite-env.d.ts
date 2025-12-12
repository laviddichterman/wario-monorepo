/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_HOST_API_KEY: string;
  readonly VITE_SOCKETIO_NS: string;
  // readonly SQUARE_APPLICATION_ID: string;
  // readonly SQUARE_LOCATION_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
