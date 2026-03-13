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
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchProjects = () => api.get('/projects').then((r) => r.data);

const isTimeoutLikeError = (err) => {
  const code = err?.code || '';
  const msg = err?.message || '';
  return code === 'ECONNABORTED' || /timeout|Network Error/i.test(msg);
};

const buildContactFormData = (data) => {
  const fd = new FormData();
  fd.append('name', data.name);
  fd.append('email', data.email);
  fd.append('message', data.message);
  if (data.subject) fd.append('subject', data.subject);
  (data.files || []).forEach(f => fd.append('attachments', f));
  return fd;
};

export const submitContact = async (data) => {
  const fd = buildContactFormData(data);

  try {
    const first = await api.post('/contact', fd, {
      timeout: 20000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return first.data;
  } catch (err) {
    if (!isTimeoutLikeError(err)) throw err;

    // Render free tier may sleep; warm the backend then retry once.
    try {
      await api.get('/health', { timeout: 15000 });
    } catch {
      // Ignore wake-up ping failures and attempt one final submit.
    }

    const retryFd = buildContactFormData(data);
    const retry = await api.post('/contact', retryFd, {
      timeout: 20000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return retry.data;
  }
};

export default api;
