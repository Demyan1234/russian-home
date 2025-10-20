import { makeAutoObservable } from 'mobx'
import { check } from '../http/userAPI.js'

class UserStore {
    constructor() {
        this._isAuth = false
        this._isAdmin = false
        this._user = {}
        makeAutoObservable(this)
    }

    async checkAuth() {
        try {
            const data = await check()
            this.login(data)
            return true
        } catch (error) {
            this.logout()
            return false
        }
    }

    login(data) {
        this._user = data.user || data
        this._isAuth = true
        this._isAdmin = data.user?.role === 'admin' || data.role === 'admin'
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(this._user))
    }

    logout() {
        this._isAuth = false
        this._isAdmin = false
        this._user = {}
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    get isAuth() {
        return this._isAuth
    }

    get isAdmin() {
        return this._isAdmin
    }

    get user() {
        return this._user
    }
}

export default UserStore