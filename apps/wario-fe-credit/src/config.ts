// API
// ----------------------------------------------------------------------

export const HOST_API = import.meta.env.VITE_HOST_API_KEY as string || '';

export const SOCKETIO = {
  ns: import.meta.env.VITE_SOCKETIO_NS as string,
}

export const IS_PRODUCTION = import.meta.env.MODE === 'production';
