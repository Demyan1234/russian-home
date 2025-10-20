const BASE_URL = '/api'

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

export const fetchBasket = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
        console.log(' No token, returning empty basket')
        return { items: [], totalAmount: 0, totalItems: 0 }
    }

    try {
        const response = await fetch(`${BASE_URL}/basket`, {
            headers: getAuthHeaders(),
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log(' Auth error, clearing token and returning empty basket')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                return { items: [], totalAmount: 0, totalItems: 0 }
            }
            throw new Error('Ошибка загрузки корзины')
        }
        
        const data = await response.json()
        return data.data || data
        
    } catch (error) {
        console.error('Basket API Error:', error)
        return { items: [], totalAmount: 0, totalItems: 0 }
    }
}

export const addToBasket = async (productId, quantity = 1) => {
    try {
        const response = await fetch(`${BASE_URL}/basket`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ product_id: productId, quantity }),
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                throw new Error('Требуется авторизация')
            }
            throw new Error('Ошибка добавления в корзину')
        }
        return response.json()
    } catch (error) {
        console.error('Basket append Error:', error)
        throw error
    }
}

export const updateBasketItem = async (productId, quantity) => {
    try {
        const response = await fetch(`${BASE_URL}/basket/${productId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity }),
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                throw new Error('Требуется авторизация')
            }
            throw new Error('Ошибка обновления корзины')
        }
        return response.json()
    } catch (error) {
        console.error('Basket updateQuantity Error:', error)
        throw error
    }
}

export const removeFromBasket = async (productId) => {
    try {
        const response = await fetch(`${BASE_URL}/basket/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        })
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                throw new Error('Требуется авторизация')
            }
            throw new Error('Ошибка удаления из корзины')
        }
        return response.json()
    } catch (error) {
        console.error('Basket remove Error:', error)
        throw error
    }
}

export const remove = removeFromBasket;

export default {
    fetchBasket,
    addToBasket, 
    updateBasketItem,
    removeFromBasket,
    remove 
}