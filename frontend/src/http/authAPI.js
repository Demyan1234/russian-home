import { $authHost, $host } from './api';

export const authAPI = {
    register: async (userData) => {
        const { data } = await $host.post('/auth/register', userData);
        return data;
    },

    login: async (email, password) => {
        const { data } = await $host.post('/auth/login', { email, password });
        return data;
    },

    verifyCode: async (email, code) => {
        const { data } = await $host.post('/auth/verify-code', { email, code });
        return data;
    },

    resendCode: async (email) => {
        const { data } = await $host.post('/auth/resend-code', { email });
        return data;
    },

    verifyEmail: async (token) => {
        const { data } = await $host.post('/auth/verify-email', { token });
        return data;
    },

    resendVerification: async () => {
        const { data } = await $authHost.post('/auth/resend-verification-email');
        return data;
    },

    checkVerification: async () => {
        const { data } = await $authHost.get('/user/me');
        return data.data?.user?.email_verified || false;
    },

    getProfile: async () => {
        const { data } = await $authHost.get('/profile');
        return data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};