import axios from 'axios';

class ApiClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(` API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params
        });
        
        return config;
      },
      (error) => {
        console.error(' API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(` API Response: ${response.status} ${response.config.url}`, response.data);
        return response;
      },
      (error) => {
        const { response } = error;
        console.error(' API Response Error:', {
          url: error.config?.url,
          status: response?.status,
          data: response?.data,
          message: error.message
        });

        if (response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth';
        }

        return Promise.reject({
          message: response?.data?.error || error.message,
          status: response?.status,
          data: response?.data
        });
      }
    );
  }

  async request(config) {
    try {
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async get(url, params = {}) {
    return this.request({ method: 'get', url, params });
  }

  async post(url, data = {}) {
    return this.request({ method: 'post', url, data });
  }

  async put(url, data = {}) {
    return this.request({ method: 'put', url, data });
  }

  async delete(url) {
    return this.request({ method: 'delete', url });
  }

  normalizeError(error) {
    if (error.response) {
      return {
        message: error.response.data?.error || 'Server error',
        status: error.response.status,
        data: error.response.data
      };
    }
    
    if (error.request) {
      return {
        message: 'Network error - no response received',
        status: 0
      };
    }
    
    return {
      message: error.message || 'Unknown error',
      status: -1
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClientInstance = new ApiClient(API_BASE_URL);