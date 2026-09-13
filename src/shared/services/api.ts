import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.veciyo.com',  // URL base de la API
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Aquí se puede obtener el token del storage o Zustand store
    // const token = useAuthStore.getState().token;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Manejar errores de red, 401, 500, etc.
    return Promise.reject(error);
  }
);

export default api;
