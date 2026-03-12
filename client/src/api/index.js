import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
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
