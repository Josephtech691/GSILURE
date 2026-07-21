import axios from 'axios';
import { enqueue, replayQueue } from './offlineQueue';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Si hors ligne et méthode mutation : mettre en queue
    if (!error.response && ['post', 'put', 'patch', 'delete'].includes(error.config?.method)) {
      const config = error.config;
      await enqueue({
        method: config.method,
        url: config.url.replace(BASE_URL, ''),
        data: config.data ? JSON.parse(config.data) : undefined,
        label: config._offlineLabel || 'Action hors ligne',
      });
      return Promise.reject({ ...error, queued: true });
    }

    return Promise.reject(error);
  }
);

/** Synchronise la queue offline dès le retour de connexion */
export async function syncOfflineQueue() {
  return replayQueue((config) => api(config));
}

/** Appelle rawApi avec un label pour la queue offline */
export function withOfflineLabel(label) {
  return { headers: { }, _offlineLabel: label };
}

export default api;
