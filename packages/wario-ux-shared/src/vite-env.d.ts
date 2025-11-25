/// <reference types="vite/client" />
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    __TANSTACK_QUERY_CLIENT__?: import("@tanstack/query-core").QueryClient;
  }
}
