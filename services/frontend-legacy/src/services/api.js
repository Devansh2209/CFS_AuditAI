// services/frontend/src/services/api.js
// API Client for communicating with the Gateway backend

import axios from 'axios';

// Base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        const apiKey = localStorage.getItem('api_key');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (apiKey) {
            config.headers['X-API-Key'] = apiKey;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear tokens and redirect to login
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('api_key');
            window.location.href = '/login';
        }

        if (error.response?.status === 429) {
            // Rate limited
            console.error('Rate limit exceeded:', error.response.data);
        }

        return Promise.reject(error);
    }
);

// ==========================================
// AUTH ENDPOINTS
// ==========================================

export const auth = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('jwt_token', response.data.token);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('api_key');
    },

    generateAPIKey: async (name, scopes) => {
        const response = await api.post('/auth/api-keys', { name, scopes });
        return response.data;
    },

    refreshToken: async () => {
        const response = await api.post('/auth/refresh');
        if (response.data.token) {
            localStorage.setItem('jwt_token', response.data.token);
        }
        return response.data;
    },
};

// ==========================================
// CLASSIFICATION ENDPOINTS
// ==========================================

export const classification = {
    classifyTransaction: async (transaction) => {
        const response = await api.post('/classify', transaction);
        return response.data;
    },

    classifyBatch: async (transactions) => {
        const response = await api.post('/classify/batch', { transactions });
        return response.data;
    },

    uploadCSV: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/classify/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

// ==========================================
// TRANSACTION ENDPOINTS
// ==========================================

export const transactions = {
    getAll: async (params = {}) => {
        const response = await api.get('/transactions', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/transactions/${id}`);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/transactions/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/transactions/${id}`);
        return response.data;
    },

    bulkApprove: async (ids) => {
        const response = await api.post('/transactions/bulk-approve', { ids });
        return response.data;
    },

    bulkFlag: async (ids) => {
        const response = await api.post('/transactions/bulk-flag', { ids });
        return response.data;
    },
};

// ==========================================
// STATS/ANALYTICS ENDPOINTS
// ==========================================

export const stats = {
    getOverview: async () => {
        const response = await api.get('/stats');
        return response.data;
    },

    getTrends: async (period = '7d') => {
        const response = await api.get('/stats/trends', { params: { period } });
        return response.data;
    },

    getCategoryBreakdown: async () => {
        const response = await api.get('/stats/category-breakdown');
        return response.data;
    },
};

// ==========================================
// COMPLIANCE ENDPOINTS
// ==========================================

export const compliance = {
    getAuditLogs: async (filters) => {
        const response = await api.get('/compliance/audit-logs', { params: filters });
        return response.data;
    },

    requestDataDeletion: async (reason) => {
        const response = await api.post('/compliance/delete-request', { reason });
        return response.data;
    },

    exportData: async () => {
        const response = await api.get('/compliance/export');
        return response.data;
    },
};

// ==========================================
// HEALTH CHECK
// ==========================================

export const health = {
    check: async () => {
        const response = await api.get('/health');
        return response.data;
    },
};

export default api;
