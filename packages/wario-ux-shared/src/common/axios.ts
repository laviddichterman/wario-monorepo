import axios, { type AxiosError } from 'axios';

export const CreateAxiosInstance = (host_api: string) => {
  const axiosInstance = axios.create({
    baseURL: host_api,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
  });
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error(`Axios error ${error.response ? JSON.stringify(error.response) : error.message}`);
      return Promise.reject(error);
    }
  );
  return axiosInstance;
};