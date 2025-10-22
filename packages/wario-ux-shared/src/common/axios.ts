import axios from 'axios';

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
    (error) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const message = error?.response?.data || 'Something went wrong';
      console.error('Axios error:', message);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return Promise.reject(new Error(message));
    }
  );
  return axiosInstance;
};