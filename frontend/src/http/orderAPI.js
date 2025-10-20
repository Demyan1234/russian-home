const BASE_URL = 'http://localhost:3000/api'

const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = {
        'Content-Type': 'application/json',
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

export const userCreate = async (orderData) => {
    const response = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
    })
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Ошибка создания заказа')
    }
    return response.json()
}

export const userGetAll = async () => {
    try {
        const response = await fetch(`${BASE_URL}/orders`, {
            headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error('Ошибка получения заказов');
        }
        
        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Get user orders error:', error);
        throw error;
    }
};

export const userGetOne = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/orders/${id}`, {
            headers: getAuthHeaders(),
        })
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Заказ не найден')
        }
        
        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Get order error:', error);
        throw error;
    }
};

export const adminGetAll = async () => {
    try {
        const response = await fetch(`${BASE_URL}/admin/orders`, {
            headers: getAuthHeaders(),
        })
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Ошибка получения заказов');
        }
        
        const data = await response.json();
        return data.data || data;
        
    } catch (error) {
        console.error('Admin orders error:', error);
        return [];
    }
}

export const adminGetOne = async (id) => {
    const response = await fetch(`${BASE_URL}/admin/orders/${id}`, {
        headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Заказ не найден')
    }
    
    const data = await response.json();
    return data.data || data;
}

export const updateOrderStatus = async (id, status) => {
    const response = await fetch(`${BASE_URL}/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
    })
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Ошибка обновления статуса')
    }
    
    const data = await response.json();
    return data.data || data;
}