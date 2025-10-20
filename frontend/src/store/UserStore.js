import { makeAutoObservable } from 'mobx'
import { fetchProfile } from '../http/catalogAPI'
import { userGetAll, userGetOne } from '../http/orderAPI' 

class UserStore {
    constructor() {
        this._isAuth = undefined
        this._isAdmin = false
        this._user = {}
        this._loading = false
        this._userOrders = [] 
        this._selectedOrder = null
        makeAutoObservable(this)
        
        this.checkAuth()
    }

async checkAuth() {
    if (this._loading) return;
    
    this._loading = true;
    
    try {
        const token = localStorage.getItem('token');
        console.log(' Checking auth, token present:', !!token);
        
        if (!token) {
            console.log(' No token found, user is not authenticated');
            this.logout();
            return false;
        }

        console.log(' Token found, validating with server...');
        const userData = await fetchProfile();
        
        console.log(' Server validation successful:', userData);
        this.login(userData, token);
        
        return true;
        
    } catch (error) {
        console.log(' Auth check failed:', error.message);
        
        if (error.message.includes('401') || 
            error.message.includes('403') || 
            error.message.includes('Неверный токен') ||
            error.message.includes('Invalid token')) {
            console.log(' Invalid token detected, clearing storage');
            this.logout();
        } else {
            console.log(' Other error, keeping auth state');
        }
        
        return false;
    } finally {
        this._loading = false;
    }
}

    
    async loadUserOrders() {
        try {
            console.log(' Loading user orders...');
            const orders = await userGetAll();
            this.setUserOrders(Array.isArray(orders) ? orders : []);
            console.log(' User orders loaded:', this._userOrders.length);
            return this._userOrders;
        } catch (error) {
            console.error(' Failed to load user orders:', error);
            this.setUserOrders([]);
            throw error;
        }
    }

    async loadOrder(orderId) {
        try {
            console.log(' Loading order:', orderId);
            const order = await userGetOne(orderId);
            this.setSelectedOrder(order);
            return order;
        } catch (error) {
            console.error(' Failed to load order:', error);
            throw error;
        }
    }

    addNewOrder(order) {
        this._userOrders.unshift(order); 
    }

    login(data, token = null) {
        console.log(' User login:', data);
        
        this._user = data;
        this._isAuth = true;
        this._isAdmin = data.role === 'admin';
        
        if (token) {
            localStorage.setItem('token', token);
        }
        localStorage.setItem('user', JSON.stringify(this._user));
        
        console.log(' Login successful, isAdmin:', this._isAdmin);
    }

    logout() {
        console.log(' User logout');
        
        this._isAuth = false;
        this._isAdmin = false;
        this._user = {};
        this._userOrders = []; 
        this._selectedOrder = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    setUserOrders(orders) {
        this._userOrders = orders;
    }

    setSelectedOrder(order) {
        this._selectedOrder = order;
    }

    get isAuth() {
        return this._isAuth;
    }

    get isAdmin() {
        return this._isAdmin;
    }

    get user() {
        return this._user;
    }

    get loading() {
        return this._loading;
    }

    get userOrders() {
        return this._userOrders;
    }

    get selectedOrder() {
        return this._selectedOrder;
    }
}

export default UserStore;