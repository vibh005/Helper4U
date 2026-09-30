import axios from 'axios';

export const TOKEN_KEY = 'h4u_token';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !isLogin) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign('/login');
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) =>
  e?.response?.data?.message ||
  (e?.code === 'ERR_NETWORK'
    ? 'Cannot reach the server. Check that the backend is running.'
    : e?.message) ||
  'Something went wrong';

export const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) s.set(k, v);
  });
  const out = s.toString();
  return out ? `?${out}` : '';
};
