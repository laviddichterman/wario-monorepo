/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_MUI_KEY: string
  readonly VITE_HOST_API_KEY: string;
  readonly VITE_SOCKETIO_NS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}