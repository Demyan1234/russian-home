const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    console.log(` API Request: ${options.method || 'GET'} ${url}`);
    console.log(' Headers:', config.headers);
    if (config.body) console.log('Body:', config.body);

    try {
      const response = await fetch(url, config);
      
      console.log(` API Response: ${response.status} ${response.statusText}`);

      const responseText = await response.text();
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error(' JSON Parse Error:', e);
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        console.error(' API Error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log(' API Success:', data);
      return data;

    } catch (error) {
      console.error(' API Request Failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Не удалось подключиться к серверу. Проверьте запущен ли бэкенд.');
      }
      
      throw error;
    }
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async getProfile() {
    return this.request('/profile');
  }

  async getBasket() {
    return this.request('/basket');
  }

  async addToBasket(productId, quantity = 1) {
    return this.request('/basket', {
      method: 'POST',
      body: { product_id: productId, quantity },
    });
  }

  async updateBasketItem(productId, quantity) {
    return this.request(`/basket/${productId}`, {
      method: 'PUT',
      body: { quantity },
    });
  }

  async removeFromBasket(productId) {
    return this.request(`/basket/${productId}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return this.request('/categories');
  }

  async getBrands() {
    return this.request('/brands');
  }

  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products?${queryString}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: orderData,
    });
  }

  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  async getAdminProducts() {
    return this.request('/admin/products');
  }

  async createProduct(productData) {
    return this.request('/admin/products', {
      method: 'POST',
      body: productData,
    });
  }

  async updateProduct(id, productData) {
    return this.request(`/admin/products/${id}`, {
      method: 'PUT',
      body: productData,
    });
  }

  async deleteProduct(id) {
    return this.request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getManagerProducts() {
    return this.request('/manager/products');
  }

  async getReviewsForModeration(status = 'pending') {
    return this.request(`/manager/reviews/moderation?status=${status}`);
  }

  async getModerationStats() {
    return this.request('/manager/reviews/moderation/stats');
  }

  async approveReview(reviewId, moderation_comment = '') {
    return this.request(`/admin/reviews/${reviewId}/approve`, {
      method: 'POST',
      body: { moderation_comment },
    });
  }

  async rejectReview(reviewId, moderation_comment) {
    return this.request(`/admin/reviews/${reviewId}/reject`, {
      method: 'POST',
      body: { moderation_comment },
    });
  }

  async initDatabase() {
    return this.request('/init-db');
  }

  async healthCheck() {
    return this.request('/health');
  }
}

const apiClient = new ApiClient();

export const $authHost = {
  get: (url, config) => apiClient.request(url, { ...config, method: 'GET' }),
  post: (url, data, config) => apiClient.request(url, { ...config, method: 'POST', body: data }),
  put: (url, data, config) => apiClient.request(url, { ...config, method: 'PUT', body: data }),
  delete: (url, config) => apiClient.request(url, { ...config, method: 'DELETE' })
};

export const $host = {
  get: (url, config) => apiClient.request(url, { ...config, method: 'GET' }),
  post: (url, data, config) => apiClient.request(url, { ...config, method: 'POST', body: data })
};

export { apiClient };