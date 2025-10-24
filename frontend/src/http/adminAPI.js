import { apiClient } from './api.js';

export const adminAPI = {
  getUsers: async () => {
    return await apiClient.request('/admin/users');
  },

  updateUserRole: async (userId, role) => {
    return await apiClient.request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role }
    });
  },

  deleteUser: async (userId) => {
    return await apiClient.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  getReviewsForModeration: async (status = 'pending') => {
    return await apiClient.request(`/admin/reviews/moderation?status=${status}`);
  },

  approveReview: async (reviewId, moderation_comment = '') => {
    return await apiClient.approveReview(reviewId, moderation_comment);
  },

  rejectReview: async (reviewId, moderation_comment) => {
    return await apiClient.rejectReview(reviewId, moderation_comment);
  },

  getModerationStats: async () => {
    return await apiClient.request('/admin/reviews/moderation/stats');
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
  }
};