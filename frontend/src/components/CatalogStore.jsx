import { makeAutoObservable } from 'mobx'

class CatalogStore {
    constructor() {
        this._categories = []
        this._brands = []
        this._products = []
        this._category = null
        this._brand = null
        this._page = 1
        this._limit = 12
        this._count = 0
        makeAutoObservable(this)
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
        this.setPage(1)
        this._category = category
    }

    set brand(brand) {
        this.setPage(1)
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