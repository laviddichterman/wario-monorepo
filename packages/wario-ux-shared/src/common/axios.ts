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
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors, @typescript-eslint/no-unsafe-member-access
    (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong')
  );
  return axiosInstance;
};