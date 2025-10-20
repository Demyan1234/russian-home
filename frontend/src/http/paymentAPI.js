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

export const createYookassaPayment = async (paymentData) => {
    try {
        console.log(' Creating Yookassa payment:', paymentData)
        
        const response = await fetch(`${BASE_URL}/payments/create-yookassa`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Ошибка создания платежа')
        }

        return response.json()
    } catch (error) {
        console.error(' Payment creation error:', error)
        throw error
    }
}

export const createTestPayment = async (paymentData) => {
    try {
        console.log(' Creating test payment:', paymentData)
        
        const response = await fetch(`${BASE_URL}/payments/create-test`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Ошибка тестового платежа')
        }

        return response.json()
    } catch (error) {
        console.error('Test payment error:', error)
        throw error
    }
}

export const checkPaymentConfig = async () => {
    try {
        const response = await fetch(`${BASE_URL}/payments/check-config`)
        return response.json()
    } catch (error) {
        console.error('Payment config check error:', error)
        throw error
    }
}

export const testYookassa = async () => {
    try {
        const response = await fetch(`${BASE_URL}/payments/test-yookassa`, {
            headers: getAuthHeaders(),
        })
        return response.json()
    } catch (error) {
        console.error('Yookassa test error:', error)
        throw error
    }
}

export default {
    createYookassaPayment,
    createTestPayment,
    checkPaymentConfig,
    testYookassa
}