import axios from 'axios';
import toast from 'react-hot-toast';

// In production VITE_API_URL points to the Railway backend (e.g. https://travel-crm.railway.app)
// In dev, /api is proxied by Vite to localhost:5000
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    } else if (err.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject(err);
  }
);

export default api;
