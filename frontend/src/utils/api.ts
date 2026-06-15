import axios from 'axios';

// Hardcoded Railway backend URL - change if your Railway URL changes
const BACKEND_URL = 'https://filedrop-production-28dd.up.railway.app/api/v1';

function getApiUrl(): string {
  const win = window as any;
  if (win?.FILEDROP_CONFIG?.apiUrl) return win.FILEDROP_CONFIG.apiUrl;
  const viteUrl = (import.meta as any).env?.VITE_API_URL;
  if (viteUrl && !viteUrl.includes('localhost')) return viteUrl;
  return BACKEND_URL;
}

export const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cfup_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const shop = new URLSearchParams(window.location.search).get('shop');
      if (shop) {
        window.location.href = `${BACKEND_URL.replace('/api/v1', '')}/auth/install?shop=${shop}`;
      }
    }
    return Promise.reject(error);
  },
);
