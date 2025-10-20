const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка сервера');
    }
    return response.json();
};

export const login = async (email, password) => {
    const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
};

export const signup = async (email, password, name = '') => {
    const response = await fetch(`${BASE_URL}/register`, {
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