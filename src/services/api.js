import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://detectorbackend.onrender.com/api';

export const authStore = {
  get() {
    const token = localStorage.getItem('detector_admin_token');
    const admin = localStorage.getItem('detector_admin_user');
    return token ? { token, admin: admin ? JSON.parse(admin) : null } : null;
  },
  set(session) {
    localStorage.setItem('detector_admin_token', session.access_token);
    localStorage.setItem('detector_admin_user', JSON.stringify(session.admin));
  },
  clear() {
    localStorage.removeItem('detector_admin_token');
    localStorage.removeItem('detector_admin_user');
  },
};

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

client.interceptors.request.use(config => {
  const session = authStore.get();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

const toError = error => {
  const message = error.response?.data?.error || error.message || 'Request failed';
  const wrapped = new Error(message);
  wrapped.status = error.response?.status;
  return wrapped;
};

export const api = {
  baseUrl: API_BASE_URL,

  async loginAdmin(credentials) {
    try {
      const response = await client.post('/auth/admin/login', credentials);
      authStore.set(response.data);
      return authStore.get();
    } catch (error) {
      throw toError(error);
    }
  },

  async registerAdmin(admin) {
    try {
      const response = await client.post('/auth/admin/register', admin);
      return response.data;
    } catch (error) {
      throw toError(error);
    }
  },

  async getMunicipalities() {
    try {
      const response = await client.get('/municipalities/');
      return response.data;
    } catch (error) {
      throw toError(error);
    }
  },

  async getIssues(status) {
    try {
      const response = await client.get('/issues/', {
        params: status ? { status } : undefined,
      });
      return response.data;
    } catch (error) {
      throw toError(error);
    }
  },

  async resolveIssue(payload) {
    try {
      const response = await client.post('/resolutions/', payload);
      return response.data;
    } catch (error) {
      throw toError(error);
    }
  },
};
