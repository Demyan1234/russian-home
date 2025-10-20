import { makeAutoObservable, runInAction } from 'mobx'
import { 
    fetchBasket, 
    addToBasket, 
    updateBasketItem, 
    removeFromBasket 
} from '../http/basketAPI'

class BasketStore {
    constructor() {
        this._products = []
        this._totalAmount = 0
        this._totalItems = 0
        this._loading = false
        makeAutoObservable(this)
    }

    async loadBasket() {
        
        if (this._loading) return
        
        this._loading = true
        try {
            const data = await fetchBasket()
            runInAction(() => {
                if (data && data.items) {
                    this._products = data.items || []
                    this._totalAmount = data.summary?.totalAmount || 0
                    this._totalItems = data.summary?.totalItems || 0
                } else {
                    this._products = []
                    this._totalAmount = 0
                    this._totalItems = 0
                }
            })
        } catch (error) {
            console.error('Basket load error:', error)
            runInAction(() => {
                this._products = []
                this._totalAmount = 0
                this._totalItems = 0
            })
        } finally {
            runInAction(() => {
                this._loading = false
            })
        }
    }

    async addProduct(productId, quantity = 1) {
        try {
            await addToBasket(productId, quantity)
            await this.loadBasket()
        } catch (error) {
            throw error
        }
    }

    async updateProductQuantity(productId, quantity) {
        try {
            await updateBasketItem(productId, quantity)
            await this.loadBasket()
        } catch (error) {
            throw error
        }
    }

    async removeProduct(productId) {
        try {
            await removeFromBasket(productId)
            await this.loadBasket()
        } catch (error) {
            throw error
        }
    }

    clearBasket() {
        runInAction(() => {
            this._products = []
            this._totalAmount = 0
            this._totalItems = 0
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

    get loading() {
        return this._loading
    }
}

export default BasketStore