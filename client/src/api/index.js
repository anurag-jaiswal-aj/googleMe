import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchProjects = () => api.get('/projects').then((r) => r.data);

export const submitContact = (data) => api.post('/contact', data).then((r) => r.data);

export default api;
