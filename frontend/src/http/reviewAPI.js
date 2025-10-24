import { $authHost, $host } from './api';

export const reviewAPI = {
    getReviewsForModeration: async (status = 'pending') => {
        const { data } = await $authHost.get(`/admin/reviews/moderation?status=${status}`);
        return data;
    },

    getModerationStats: async () => {
        const { data } = await $authHost.get('/admin/reviews/moderation/stats');
        return data;
    },

    approveReview: async (reviewId, moderationComment = '') => {
        const { data } = await $authHost.post(`/admin/reviews/${reviewId}/approve`, {
            moderation_comment: moderationComment
        });
        return data;
    },

    rejectReview: async (reviewId, moderationComment) => {
        const { data } = await $authHost.post(`/admin/reviews/${reviewId}/reject`, {
            moderation_comment: moderationComment
        });
        return data;
    },

    getProductReviews: async (productId) => {
        const { data } = await $host.get(`/products/${productId}/reviews`);
        return data;
    },

    addReview: async (productId, rating, comment) => {
        const { data } = await $authHost.post(`/products/${productId}/reviews`, {
            rating,
            comment
        });
        return data;
    },

    getProductRating: async (productId) => {
        const { data } = await $host.get(`/api/products/${productId}/rating`);
        return data;
    }
};