import axios from 'axios';

export const getApiBaseUrl = () => {
  const configured = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;

  if (typeof window !== 'undefined') {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalHost) {
      // In any deployed environment (custom domain, Vercel preview, etc.),
      // fall back to the live Render API if VITE_API_URL is missing or points to localhost.
      if (!configured || /localhost|127\.0\.0\.1/.test(configured)) {
        return 'https://googleme.onrender.com/api';
      }
      return configured;
    }
  }

  return configured || '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
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

import { generateIdempotencyKey } from '../utils/idempotency.js';
export { generateIdempotencyKey };

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
  if (data._hp !== undefined) fd.append('_hp', data._hp);
  if (data.idempotencyKey) fd.append('idempotencyKey', data.idempotencyKey);
  (data.files || []).forEach(f => fd.append('attachments', f));
  return fd;
};

export const submitContact = async (data) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const fd = buildContactFormData({ ...data, idempotencyKey });
  const headers = {
    'Content-Type': 'multipart/form-data',
    'Idempotency-Key': idempotencyKey,
  };

  try {
    const first = await api.post('/contact', fd, {
      timeout: 30000,
      headers,
    });
    return first.data;
  } catch (err) {
    if (!isTimeoutLikeError(err)) throw err;

    // Render free tier may sleep; warm the backend then retry once with the exact same key.
    try {
      await api.get('/health', { timeout: 15000 });
    } catch {
      // Ignore wake-up ping failures and attempt one final submit.
    }

    const retryFd = buildContactFormData({ ...data, idempotencyKey });
    const retry = await api.post('/contact', retryFd, {
      timeout: 30000,
      headers,
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
export const reorderImages = (imageIds) => api.put('/images/reorder', { imageIds }).then((r) => r.data);

// ── Site Config ──────────────────────────────────────
export const fetchConfig = () => api.get('/config').then(r => r.data);
export const saveConfig  = (key, value) => api.post('/config', { key, value }).then(r => r.data);
export const saveConfigBulk = (updates) => api.post('/config', { updates }).then(r => r.data);

export const submitFeedback = async (data) => {
  const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();
  const buildFeedbackFormData = () => {
    const fd = new FormData();
    fd.append('type', data.type);
    fd.append('message', data.message);
    if (data.name)       fd.append('name', data.name);
    if (data.email)      fd.append('email', data.email);
    if (data.page)       fd.append('page', data.page);
    if (data.attachment) fd.append('attachment', data.attachment);
    if (data._hp !== undefined) fd.append('_hp', data._hp);
    fd.append('idempotencyKey', idempotencyKey);
    return fd;
  };

  const headers = {
    'Idempotency-Key': idempotencyKey,
  };

  const post = (timeout) => api.post('/feedback', buildFeedbackFormData(), {
    timeout,
    headers,
  }).then((r) => r.data);

  try {
    return await post(30000);
  } catch (err) {
    if (!isTimeoutLikeError(err)) throw err;
    try { await api.get('/health', { timeout: 15000 }); } catch {}
    return await post(30000);
  }
};

// ── Admin Feedback Inbox ─────────────────────────────
export const fetchAdminFeedback = (params = {}) =>
  api.get('/feedback', { params }).then((r) => r.data);

export const updateFeedbackStatus = (id, status) =>
  api.patch(`/feedback/${id}/status`, { status }).then((r) => r.data);

export const deleteFeedback = (id) =>
  api.delete(`/feedback/${id}`).then((r) => r.data);
