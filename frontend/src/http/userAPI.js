import { $authHost } from './api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка сервера');
    }
    return response.json();
};

export const userAPI = {
    checkEmailVerification: async () => {
        try {
            const response = await $authHost.get('/api/user/me');
            return response.data?.user?.email_verified || false;
        } catch (error) {
            console.error('Email verification check failed:', error);
            return false;
        }
    },

    getUserInfo: async () => {
        const response = await $authHost.get('/api/user/me');
        return response;
    },

    getUserPermissions: async () => {
        const response = await $authHost.get('/api/user/permissions');
        return response;
    },

    checkPermission: async (permission) => {
        const response = await $authHost.post('/api/user/check-permission', { permission });
        return response;
    }
};

export const checkEmailVerification = userAPI.checkEmailVerification;

export const verifyEmail = async (token) => {
    const response = await fetch(`${BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    });
    return handleResponse(response);
};

export const resendVerificationEmail = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Требуется авторизация');
    }

    const response = await fetch(`${BASE_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    return handleResponse(response);
};




export const login = async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
};

export const signup = async (email, password, name = '') => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
    });
    return handleResponse(response);
};

export const check = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Токен не найден');
    }

    const response = await fetch(`${BASE_URL}/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    return handleResponse(response);
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

