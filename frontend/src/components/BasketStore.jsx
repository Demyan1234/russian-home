import { makeAutoObservable, runInAction } from 'mobx'
import { fetchBasket } from '../http/catalogAPI.js'

class BasketStore {
    constructor() {
        this._products = []
        this._totalAmount = 0
        this._totalItems = 0
        makeAutoObservable(this)
    }

    async loadBasket() {
        try {
            const data = await fetchBasket()
            runInAction(() => {
                if (data.success) {
                    this._products = data.data.items || []
                    this._totalAmount = data.data.summary?.totalAmount || 0
                    this._totalItems = data.data.summary?.totalItems || 0
                } else {
                    this._products = []
                    this._totalAmount = 0
                    this._totalItems = 0
                }
            })
        } catch (error) {
            console.error('Error loading basket:', error)
            runInAction(() => {
                this._products = []
                this._totalAmount = 0
                this._totalItems = 0
            })
        }
    }

    set products(products) {
        runInAction(() => {
            this._products = products || []
            this._totalAmount = this._products.reduce((sum, item) => 
                sum + ((item.finalPrice || item.price) * item.quantity), 0
            )
            this._totalItems = this._products.length
        })
    }

    get products() {
        return this._products
    }

    get totalAmount() {
        return this._totalAmount
    }

    get totalItems() {
        return this._totalItems
    }

    get count() {
        return this._products.reduce((sum, item) => sum + item.quantity, 0)
    }
}

export default BasketStore