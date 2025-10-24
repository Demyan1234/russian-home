import { apiClient } from './api.js';

export const managerAPI = {
  getProducts: async () => {
    return await apiClient.getManagerProducts();
  },

  updateProduct: async (productId, productData) => {
    return await apiClient.request(`/admin/products/${productId}`, {
      method: 'PUT',
      body: productData
    });
  },

  deleteProduct: async (productId) => {
    return await apiClient.request(`/admin/products/${productId}`, {
      method: 'DELETE'
    });
  },

  createProduct: async (productData) => {
    return await apiClient.request('/admin/products', {
      method: 'POST',
      body: productData
    });
  },

  getReviewsForModeration: async (status = 'pending') => {
    return await apiClient.getReviewsForModeration(status);
  },

  getModerationStats: async () => {
    return await apiClient.getModerationStats();
  },

  approveReview: async (reviewId, moderation_comment = '') => {
    return await apiClient.approveReview(reviewId, moderation_comment);
  },

  rejectReview: async (reviewId, moderation_comment) => {
    return await apiClient.rejectReview(reviewId, moderation_comment);
  },

  getFilterStats: async () => {
    return await apiClient.request('/admin/filters/stats');
  },

  deleteMaterial: async (material) => {
    return await apiClient.request(`/admin/filters/materials/${material}`, {
      method: 'DELETE'
    });
  },

  deleteColor: async (color) => {
    return await apiClient.request(`/admin/filters/colors/${color}`, {
      method: 'DELETE'
    });
  },

  deleteBrand: async (brandId) => {
    return await apiClient.request(`/admin/brands/${brandId}`, {
      method: 'DELETE'
    });
  },

  deleteCategory: async (categoryId) => {
    return await apiClient.request(`/admin/categories/${categoryId}`, {
      method: 'DELETE'
    });
  },

  cleanupMaterials: async (materialsToRemove) => {
    return await apiClient.request('/admin/filters/materials/cleanup', {
      method: 'POST',
      body: { materialsToRemove }
    });
  },

  cleanupColors: async (colorsToRemove) => {
    return await apiClient.request('/admin/filters/colors/cleanup', {
      method: 'POST',
      body: { colorsToRemove }
    });
  },

  getBrands: async () => {
    return await apiClient.getBrands();
  },

  getCategories: async () => {
    return await apiClient.getCategories();
  }
};