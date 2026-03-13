import axios from 'axios';

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL;

  if (configured) {
    // Ignore accidental localhost config in deployed environments.
    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const pointsToLocalApi = /localhost|127\.0\.0\.1/.test(configured);
      if (!isLocalHost && pointsToLocalApi) {
        return 'https://googleme.onrender.com/api';
      }
    }
    return configured;
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return 'https://googleme.onrender.com/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchProjects = () => api.get('/projects').then((r) => r.data);

export const submitContact = (data) => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('email', data.email);
  fd.append('message', data.message);
  if (data.subject) fd.append('subject', data.subject);
  (data.files || []).forEach(f => fd.append('attachments', f));
  return api.post('/contact', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export default api;
