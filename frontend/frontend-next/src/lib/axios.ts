import axios from 'axios';  
import { useAuthStore } from '@/store/authStore';  
  
// Создаем экземпляр axios с базовым URL  
const api = axios.create({  
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/',  
});  
  
// Добавляем interceptor для автоматической обработки ошибок аутентификации  
api.interceptors.response.use(  
  (response) => response, // Успешные ответы пропускаем без изменений  
  (error) => {  
    // Если получили 401 или 403 - токен истек или невалиден  
    if (error.response?.status === 401 || error.response?.status === 403) {  
      const { logout } = useAuthStore.getState();  
      logout(); // Очищаем токен из localStorage  
        
      // Перенаправляем на страницу логина  
      if (typeof window !== 'undefined') {  
        window.location.href = '/login';  
      }  
    }  
    return Promise.reject(error);  
  }  
);  
  
export default api;