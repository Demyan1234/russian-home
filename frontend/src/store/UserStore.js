import { makeAutoObservable } from 'mobx'
import { fetchProfile } from '../http/catalogAPI'
import { userGetAll, userGetOne } from '../http/orderAPI' 
import { userAPI } from '../http/userAPI'

class UserStore {
    constructor() {
        this._isAuth = undefined
        this._isAdmin = false
        this._isManager = false 
        this._user = {}
        this._loading = false
        this._userOrders = [] 
        this._selectedOrder = null
        this._emailVerified = false 
        makeAutoObservable(this)
        
        this.checkAuth()
    }
async checkEmailVerification() {
    try {
        const response = await authAPI.checkVerification();
        this.setEmailVerified(response);
        return response;
    } catch (error) {
        console.error('Email verification check failed:', error);
        this.setEmailVerified(false);
        return false;
    }
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
        
        if (userData.email_verified !== undefined) {
            this.setEmailVerified(userData.email_verified);
        }
        
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

    setEmailVerified(verified) {
        this._emailVerified = verified;
    }

    get emailVerified() {
        return this._emailVerified;
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

    login(data, token = null) {
        console.log(' User login:', data);
        
        this._user = data;
        this._isAuth = true;
        this._isAdmin = data.role === 'admin';
        this._isManager = data.role === 'manager'; 
        this._emailVerified = data.email_verified || false; 
        
        if (token) {
            localStorage.setItem('token', token);
        }
        localStorage.setItem('user', JSON.stringify(this._user));
        
        console.log(' Login successful, isAdmin:', this._isAdmin, 'isManager:', this._isManager, 'emailVerified:', this._emailVerified);
    }

    logout() {
        console.log(' User logout');
        
        this._isAuth = false;
        this._isAdmin = false;
        this._isManager = false;
        this._user = {};
        this._userOrders = []; 
        this._selectedOrder = null;
        this._emailVerified = false; 
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

    get isManager() {
        return this._isManager;
    }
}

export default UserStore;