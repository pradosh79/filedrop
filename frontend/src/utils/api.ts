import axios from 'axios';
import { getApiUrl } from './config';

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 30_000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cfup_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const shop = new URLSearchParams(window.location.search).get('shop');
      if (shop) {
        window.location.href = `${getApiUrl().replace('/api/v1', '')}/auth/install?shop=${shop}`;
      }
    }
    return Promise.reject(error);
  },
);
