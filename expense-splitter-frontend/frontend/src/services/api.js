import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth APIs ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Group APIs ───────────────────────────────────────────
export const groupAPI = {
  create: (data) => api.post('/groups', data),
  getAll: () => api.get('/groups'),
  getById: (id) => api.get(`/groups/${id}`),
  addMember: (id, data) => api.post(`/groups/${id}/members`, data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
  generateInviteLink: (id) => api.post(`/groups/${id}/invite`),
  joinByInviteLink: (token) => api.post(`/groups/join/${token}`),
};

// ─── Expense APIs ─────────────────────────────────────────
export const expenseAPI = {
  createManual: (data) => api.post('/expenses/manual', data),
  createNatural: (data) => api.post('/expenses/natural', data),
  uploadReceipt: (formData) => api.post('/expenses/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  saveAiExpense: (data, type) => api.post(`/expenses/save-ai?type=${type}`, data),
  // UPDATED: now supports pagination — page starts at 0, default size 10
  getGroupExpenses: (groupId, page = 0, size = 10) =>
    api.get(`/expenses/group/${groupId}?page=${page}&size=${size}`),
  // fetch all expenses for PDF export
  getAllGroupExpenses: (groupId) =>
    api.get(`/expenses/group/${groupId}?page=0&size=1000`),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getRecent: () => api.get('/expenses/recent'),
};

// ─── Split APIs ───────────────────────────────────────────
export const splitAPI = {
  splitEqually: (expenseId) => api.post(`/splits/equal/${expenseId}`),
  splitByItems: (expenseId) => api.post(`/splits/itemwise/${expenseId}`),
  getBalances: (groupId) => api.get(`/splits/balances/${groupId}`),
  settle: (data) => api.post('/splits/settle', data),
  getExpenseSplits: (expenseId) => api.get(`/splits/expense/${expenseId}`),
  splitCustom: (expenseId, data) => api.post(`/splits/custom/${expenseId}`, data),
  getSettledSplits: (groupId) => api.get(`/splits/settled/${groupId}`),
};

export const profileAPI = {
  changePassword: (data) => api.put('/auth/change-password', data),
};

export default api;