// src/lib/api.ts
import { useAuthStore } from '@/store/authStore';

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const { token } = useAuthStore.getState();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Ошибка запроса';
    try {
      const err = await response.json();
      errorMessage = err.message || errorMessage;
    } catch {
      errorMessage = await response.text() || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response;
};