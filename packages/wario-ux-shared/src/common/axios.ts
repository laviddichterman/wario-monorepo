import axios, { type AxiosError, isAxiosError } from 'axios';

export const CreateAxiosInstance = (host_api: string) => {
  const axiosInstance = axios.create({
    baseURL: host_api,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error(`Axios error ${error.response ? JSON.stringify(error.response) : error.message}`);
      return Promise.reject(error);
    },
  );
  return axiosInstance;
};

type RejectHandler<ErrorType, ReturnType> = (error: ErrorType) => ReturnType;
export const handleAxiosError = <ErrorType, ReturnType = unknown>(
  error: unknown,
  unknownHandler: RejectHandler<unknown, ReturnType>,
  handler: RejectHandler<ErrorType, ReturnType> = unknownHandler,
): ReturnType => {
  if (isAxiosError<ErrorType>(error)) {
    if (error.response) {
      return handler(error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error during request setup:', error.message);
    }
  } else {
    console.error('Non-Axios error occurred:', error);
  }
  // this means it's some other error, not the type we're expecting from the API
  return unknownHandler(error);
};
