const API_BASE_URL = '/api';

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
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products?${queryString}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async login(email, password) {
    return this.request('/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(userData) {
    return this.request('/register', {
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

  async initDatabase() {
    return this.request('/init-db');
  }
}

export const apiClient = new ApiClient();