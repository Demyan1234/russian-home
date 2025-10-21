const BASE_URL = '/api';

class ApiClient {
    constructor() {
        this.baseURL = BASE_URL;
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
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        console.log(` API Request: ${options.method || 'GET'} ${url}`);
        console.log(' Headers:', config.headers);
        if (config.body) console.log(' Body:', config.body);

        try {
            const response = await fetch(url, config);
            
            console.log(` API Response: ${response.status} ${response.statusText}`);

            const responseText = await response.text();
            let data;
            
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error(' JSON Parse Error:', e);
                throw new Error('Invalid JSON response from server');
            }

            if (!response.ok) {
                const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
                console.error(' API Error:', errorMessage);
                throw new Error(errorMessage);
            }

            console.log(' API Success:', data);
            return data;

        } catch (error) {
            console.error(' API Request Failed:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Не удалось подключиться к серверу. Проверьте запущен ли бэкенд.');
            }
            
            throw error;
        }
    }

    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
        });
    }

    async getProfile() {
        return this.request('/profile');
    }

    async getHomepageData() {
        return this.request('/homepage-data');
    }

    async getCategories() {
        return this.request('/categories');
    }

    async getBrands() {
        return this.request('/brands');
    }

async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products?${queryString}`);
}

    async getProduct(id) {
        return this.request(`/products/${id}`);
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
}

export const fetchUserOrders = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Fetching user orders...');

        const response = await fetch(`${BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
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
        console.error('Fetch User Orders Error:', error);
        throw error;
    }
};

export const getOrder = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Fetching order:', id);

        const response = await fetch(`${BASE_URL}/orders/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Заказ не найден');
        }

        const data = await response.json();
        return data.data || data;

    } catch (error) {
        console.error('Get Order Error:', error);
        throw error;
    }
};

export const createProduct = async (formData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Creating product...');

        const response = await fetch(`/api/admin/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });

        console.log('📨 Create product response status:', response.status);

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorText = await response.text();
                console.log(' Error response text:', errorText);
                
                if (errorText) {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorData.message || errorText;
                }
            } catch (parseError) {
                console.log(' Cannot parse error response:', parseError);
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(' Create product success:', result);
        return result;

    } catch (error) {
        console.error(' Create Product Error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Не удалось подключиться к серверу. Проверьте запущен ли бэкенд на порту 3000.');
        }
        
        throw error;
    }
};



export const updateProduct = async (id, formData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Отправка запроса на обновление товара:', id);
        
        const response = await fetch(`${BASE_URL}/admin/products/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });

        console.log(' Ответ сервера:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(' Ошибка ответа:', errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: `HTTP error: ${response.status}` };
            }
            throw new Error(errorData.error || `Ошибка обновления товара: ${response.status}`);
        }

        const result = await response.json();
        console.log(' Товар успешно обновлен:', result);
        return result;

    } catch (error) {
        console.error(' Update Product Error:', error);
        throw error;
    }
};

export const deleteProduct = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Frontend: Deleting product:', id);

        const response = await fetch(`${BASE_URL}/admin/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(' Delete response status:', response.status);

        let responseData;
        try {
            responseData = await response.json();
        } catch (parseError) {
            console.error(' JSON parse error:', parseError);
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        if (!response.ok) {
            console.error(' Server error response:', responseData);
            throw new Error(responseData.error || `Ошибка удаления товара: ${response.status}`);
        }

        console.log(' Delete success:', responseData);
        return responseData;

    } catch (error) {
        console.error(' Delete Product Error:', error);
        throw error;
    }
};


export const deleteBrand = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Deleting brand:', id);

        const response = await fetch(`${BASE_URL}/admin/brands/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Delete brand response status:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `HTTP error: ${response.status}` };
            }
            
            throw new Error(errorData.error || `Ошибка удаления бренда: ${response.status}`);
        }

        const result = await response.json();
        console.log('Delete brand success:', result);
        
        return result;

    } catch (error) {
        console.error('Delete Brand Error:', error);
        throw error;
    }
};

export const apiClient = new ApiClient();
export const loginUser = (email, password) => apiClient.login(email, password);
export const registerUser = (userData) => apiClient.register(userData);
export const fetchProfile = () => apiClient.getProfile();
export const fetchHomepageData = () => apiClient.getHomepageData();
export const fetchCategories = () => apiClient.getCategories();
export const fetchBrands = () => apiClient.getBrands();
export const fetchAllProducts = () => apiClient.getProducts();
export const fetchProducts = (params = {}) => apiClient.getProducts(params);
export const fetchOneProduct = (id) => apiClient.getProduct(id);
export const fetchBasket = () => apiClient.getBasket();
export const addToBasket = (productId, quantity) => apiClient.addToBasket(productId, quantity);

export const fetchAdminStats = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Fetching admin stats...');

        const response = await fetch(`${BASE_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(' Admin stats endpoint not available, returning fallback data');
            return getFallbackStats();
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            return data;
        } else {
            console.warn(' Admin stats format invalid, returning fallback data');
            return getFallbackStats();
        }

    } catch (error) {
        console.error(' Fetch Admin Stats Error:', error);
        return getFallbackStats();
    }
};

const getFallbackStats = () => {
    const fallbackData = {
        success: true,
        data: {
            totalProducts: 45,
            totalOrders: 128,
            totalUsers: 89,
            totalRevenue: 1250000,
            todayOrders: 3,
            monthlyRevenue: 150000,
            recentOrders: [
                { 
                    id: 1, 
                    total_amount: 4500, 
                    status: 'processing', 
                    created_at: new Date().toISOString(),
                    customer_name: 'Тестовый пользователь'
                },
                { 
                    id: 2, 
                    total_amount: 8900, 
                    status: 'delivered', 
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    customer_name: 'Тестовый пользователь 2'
                }
            ],
            lowStockProducts: [
                { id: 1, name: 'Раковина керамическая', stock_quantity: 2, price: 4500 },
                { id: 2, name: 'Смеситель хром', stock_quantity: 3, price: 3200 }
            ],
            popularProducts: [
                { id: 1, name: 'Раковина керамическая', sales_count: 15, total_revenue: 67500 },
                { id: 2, name: 'Смеситель хром', sales_count: 12, total_revenue: 38400 }
            ]
        }
    };
    
    console.log(' Using fallback stats data');
    return fallbackData;
};

export const fetchAllCategories = async () => {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}/admin/categories`, {
            headers: headers
        });

        if (!response.ok) {
            return fetchCategories();
        }

        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Fetch All Categories Error:', error);
        return [];
    }
};

export const createCategory = async (categoryData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка создания категории: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error('Create Category Error:', error);
        throw error;
    }
};

export const updateCategory = async (id, categoryData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка обновления категории: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error('Update Category Error:', error);
        throw error;
    }
};

export const deleteCategory = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Deleting category:', id);

        const response = await fetch(`${BASE_URL}/admin/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Delete category response status:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `HTTP error: ${response.status}` };
            }
            
            throw new Error(errorData.error || `Ошибка удаления категории: ${response.status}`);
        }

        const result = await response.json();
        console.log('Delete category success:', result);
        
        return result;

    } catch (error) {
        console.error('Delete Category Error:', error);
        throw error;
    }
};

export const fetchCategoriesStats = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Fetching categories stats...');

        const response = await fetch(`${BASE_URL}/admin/filters/categories-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(' Categories stats endpoint not available, returning empty data');
            return [];
        }

        const data = await response.json();
        return data.data || data || [];
        
    } catch (error) {
        console.error(' Fetch Categories Stats Error:', error);
        return [];
    }
};

export const forceDeleteBrand = async (id) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Force deleting brand:', id);

        const response = await fetch(`${BASE_URL}/admin/brands/${id}/force`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Force delete brand response status:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `HTTP error: ${response.status}` };
            }
            
            throw new Error(errorData.error || `Ошибка принудительного удаления бренда: ${response.status}`);
        }

        const result = await response.json();
        console.log('Force delete brand success:', result);
        
        return result;

    } catch (error) {
        console.error('Force Delete Brand Error:', error);
        throw error;
    }
};

export const fetchAllBrands = async () => {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}/admin/brands`, {
            headers: headers
        });

        if (!response.ok) {
            return fetchBrands();
        }

        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Fetch All Brands Error:', error);
        return [];
    }
};

export const fetchFiltersStats = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/filters/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка получения статистики фильтров');
        }

        return response.json();
    } catch (error) {
        console.error('Fetch Filters Stats Error:', error);
        throw error;
    }
};

export const cleanupMaterials = async (materialsToRemove) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/filters/materials/cleanup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ materialsToRemove })
        });

        if (!response.ok) {
            throw new Error('Ошибка очистки материалов');
        }

        return response.json();
    } catch (error) {
        console.error('Cleanup Materials Error:', error);
        throw error;
    }
};

export const cleanupColors = async (colorsToRemove) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/filters/colors/cleanup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ colorsToRemove })
        });

        if (!response.ok) {
            throw new Error('Ошибка очистки цветов');
        }

        return response.json();
    } catch (error) {
        console.error('Cleanup Colors Error:', error);
        throw error;
    }
};

export const deleteMaterial = async (material) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/filters/materials/${encodeURIComponent(material)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка удаления материала');
        }

        return response.json();
    } catch (error) {
        console.error('Delete Material Error:', error);
        throw error;
    }
};

export const deleteColor = async (color) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/filters/colors/${encodeURIComponent(color)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка удаления цвета');
        }

        return response.json();
    } catch (error) {
        console.error('Delete Color Error:', error);
        throw error;
    }
};

export const createBrand = async (brandData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`${BASE_URL}/admin/brands`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(brandData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка создания бренда: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error('Create Brand Error:', error);
        throw error;
    }
};

export const fetchProductReviews = async (productId) => {
    try {
        const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch product reviews error:', error);
        throw error;
    }
};

export const fetchProductRating = async (productId) => {
    try {
        const response = await fetch(`http://localhost:3000/api/products/${productId}/rating`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch product rating error:', error);
        throw error;
    }
};

export const addProductReview = async (productId, reviewData) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Add product review error:', error);
        throw error;
    }
};

export const fetchAdminProducts = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Требуется авторизация');
        }

        console.log(' Fetching admin products...');

        const response = await fetch(`${BASE_URL}/admin/products`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка получения товаров: ${response.status}`);
        }

        const data = await response.json();
        console.log(' Admin products received:', data.data?.length || 0);
        return data;

    } catch (error) {
        console.error(' Fetch Admin Products Error:', error);
        throw error;
    }
};