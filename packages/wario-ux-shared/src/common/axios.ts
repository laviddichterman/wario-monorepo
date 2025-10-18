import axios from 'axios';

export const CreateAxiosInstance = (host_api: string) => {
  const axiosInstance = axios.create({
    baseURL: host_api,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong')
  );
  return axiosInstance;
};