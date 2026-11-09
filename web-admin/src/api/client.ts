import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

const api = axios.create({
  baseURL: '/api/v1',
});

let refreshPromise: Promise<string> | null = null;

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

api.interceptors.request.use((config) => {
  const access = useAuthStore.getState().access;

  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const isAuthRequest =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh');

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    const refresh = useAuthStore.getState().refresh;

    if (!refresh) {
      useAuthStore.getState().logout();
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post<RefreshResponse>('/api/v1/auth/refresh', {
            refresh_token: refresh,
          })
          .then(({ data }) => {
            useAuthStore
              .getState()
              .setTokens(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const access = await refreshPromise;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
