import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🆕 Обработка ошибок - не редиректим автоматически
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Редирект только для защищенных эндпоинтов
    const protectedEndpoints = ['/api/places', '/api/places/', '/api/auth/refresh'];
    const isProtected = protectedEndpoints.some(endpoint => 
      error.config?.url?.startsWith(endpoint) && error.config?.method !== 'get'
    );
    
    if (isProtected && (error.response?.status === 401 || error.response?.status === 403)) {
      const { logout } = useAuthStore.getState();
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;