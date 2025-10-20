import { makeAutoObservable } from 'mobx'
import { fetchProducts } from '../http/catalogAPI'

class CatalogStore {
    constructor() {
        this._categories = []
        this._brands = []
        this._products = []
        this._selectedProduct = null
        this._loading = false
        this._totalCount = 0
        this._currentPage = 1
        this._sort = { sortBy: 'created_at', sortOrder: 'DESC' }
        makeAutoObservable(this)
    }

    async fetchProducts(params = {}) {
        this._loading = true
        try {
            const queryParams = {
                ...params,
                sortBy: this._sort.sortBy,
                sortOrder: this._sort.sortOrder
            }
            
            const data = await fetchProducts(queryParams)
            
            if (data.success) {
                this._products = data.data.products || []
                this._totalCount = data.data.pagination.totalCount || 0
                this._currentPage = data.data.pagination.currentPage || 1
            } else {
                this._products = []
                this._totalCount = 0
            }
        } catch (error) {
            console.error('Catalog fetch error:', error)
            this._products = []
            this._totalCount = 0
        } finally {
            this._loading = false
        }
    }
    setSort(sortBy, sortOrder) {
        this._sort = { sortBy, sortOrder }
    }

    set categories(categories) {
        this._categories = categories
    }

    set brands(brands) {
        this._brands = brands
    }

    set products(products) {
        this._products = products
    }

    set category(category) {
        this._page = 1
        this._category = category
    }

    set brand(brand) {
        this._page = 1
        this._brand = brand
    }

    set page(page) {
        this._page = page
    }

    set limit(limit) {
        this._limit = limit
    }

    set count(count) {
        this._count = count
    }

    get categories() {
        return this._categories
    }

    get brands() {
        return this._brands
    }

    get products() {
        return this._products
    }

    get category() {
        return this._category
    }

    get brand() {
        return this._brand
    }

    get page() {
        return this._page
    }

    get limit() {
        return this._limit
    }

    get count() {
        return this._count
    }
}

export default CatalogStore