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

// Attach JWT token to every request if present
api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Admin Auth ────────────────────────────────────────
export const adminLogin  = (password) => api.post('/admin/login', { password }).then(r => r.data);
export const adminVerify = () => api.post('/admin/verify').then(r => r.data);

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

export const fetchGithubRepos = () => api.get('/github/repos').then((r) => r.data);
export const saveGithubSelection = (selectedRepos) =>
  api.post('/github/selection', { selectedRepos }).then((r) => r.data);

export const fetchImages = () => api.get('/images').then((r) => r.data);
export const uploadImage = (formData) =>
  api.post('/images', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }).then((r) => r.data);
export const updateImage = (id, data) => api.patch(`/images/${id}`, data).then((r) => r.data);
export const deleteImage = (id) => api.delete(`/images/${id}`).then((r) => r.data);

// ── Site Config ──────────────────────────────────────
export const fetchConfig = () => api.get('/config').then(r => r.data);
export const saveConfig  = (key, value) => api.post('/config', { key, value }).then(r => r.data);
export const saveConfigBulk = (updates) => api.post('/config', { updates }).then(r => r.data);

export const uploadResume = (file) => {
  const fd = new FormData();
  fd.append('resume', file);
  return api.post('/config/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const submitFeedback = async (data) => {
  const fd = new FormData();
  fd.append('type', data.type);
  fd.append('message', data.message);
  if (data.name)       fd.append('name', data.name);
  if (data.email)      fd.append('email', data.email);
  if (data.page)       fd.append('page', data.page);
  if (data.attachment) fd.append('attachment', data.attachment);

  const post = (timeout) => api.post('/feedback', fd, {
    timeout,
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

  try {
    return await post(20000);
  } catch (err) {
    if (!isTimeoutLikeError(err)) throw err;
    try { await api.get('/health', { timeout: 15000 }); } catch {}
    return await post(20000);
  }
};
