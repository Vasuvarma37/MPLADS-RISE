/**
 * MPLADS RISE — API Client
 * Axios instance with JWT auth interceptors
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  me: () => api.get('/auth/me'),
};

// ── Projects ─────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: (params?: Record<string, any>) => api.get('/projects', { params }),
  summary: () => api.get('/projects/summary'),
  stateAnalytics: () => api.get('/projects/state-analytics'),
  detail: (id: string) => api.get(`/projects/${id}`),
  assessRisk: (id: string) => api.post(`/projects/${id}/assess-risk`),
  uploadDocument: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/projects/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getDocuments: (id: string) => api.get(`/projects/${id}/documents`),
};

// ── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: (params?: Record<string, any>) => api.get('/alerts', { params }),
  summary: () => api.get('/alerts/summary'),
  update: (id: number, data: { status: string; assigned_to?: string }) =>
    api.patch(`/alerts/${id}`, data),
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  riskTrend: () => api.get('/analytics/risk-trend'),
  scatter: () => api.get('/analytics/scatter'),
};

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  ask: (question: string, project_context?: any) =>
    api.post('/ai/ask', { question, project_context }),
  knowledge: () => api.get('/ai/knowledge'),
  upload: (text: string, source: string, category: string) =>
    api.post('/ai/upload', { text, source, category }),
  uploadFile: (source: string, category: string, file: File) => {
    const formData = new FormData();
    formData.append('source', source);
    formData.append('category', category);
    formData.append('file', file);
    return api.post('/ai/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
