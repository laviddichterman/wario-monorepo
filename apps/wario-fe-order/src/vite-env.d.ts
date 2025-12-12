/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_MUI_KEY: string;
  readonly VITE_HOST_API_KEY: string;
  readonly VITE_SOCKETIO_NS: string;
  readonly MESSAGE_REQUEST_VEGAN: string;
  readonly MESSAGE_REQUEST_SLICING: string;
  readonly MESSAGE_REQUEST_WELLDONE: string;
  readonly MESSAGE_REQUEST_HALF: string;
  readonly TIP_PREAMBLE: string;
  readonly DELIVERY_LINK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
