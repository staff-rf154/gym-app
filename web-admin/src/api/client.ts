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
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<RefreshResponse>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        useAuthStore.getState().setAccess(data.access_token);
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

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

    try {
      const access = await refreshAccessToken();
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
