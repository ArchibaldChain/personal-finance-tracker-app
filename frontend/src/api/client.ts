import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth token interceptor — no-op until Google Sign-In is connected.
// When GSP is integrated: store the Firebase ID token in localStorage
// under the key 'auth_token' and this interceptor will attach it automatically.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !err?.config?.url?.includes('/auth/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('activeUserId');
      window.location.href = '/login';
    }
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    if (detail) {
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      const truncated = msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
      err.message = status ? `${status} — ${truncated}` : truncated;
    }
    return Promise.reject(err);
  },
);

export default client;
