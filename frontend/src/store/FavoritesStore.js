import { makeAutoObservable, runInAction } from 'mobx'

class FavoritesStore {
    constructor() {
        this._favorites = []
        this._loading = false
        this._error = null
        makeAutoObservable(this)
    }

async loadFavorites() {
    if (this._loading) return
    
    runInAction(() => {
        this._loading = true
        this._error = null
    })
    
    try {
        const token = localStorage.getItem('token')
        if (!token) {
            throw new Error('Требуется авторизация')
        }

        console.log(' Loading favorites...')

        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        if (response.status === 403) {
            console.log(' Token expired, clearing storage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            throw new Error('Токен устарел, требуется повторная авторизация');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Ошибка загрузки избранного')
        }

        const data = await response.json()
        console.log(' Favorites loaded:', data)
        
        runInAction(() => {
            this._favorites = data.data || data || []
        })
        
    } catch (error) {
        console.error(' Load favorites error:', error)
        runInAction(() => {
            this._error = error.message
            this._favorites = []
        })
    } finally {
        runInAction(() => {
            this._loading = false
        })
    }
}

    async addToFavorites(productId) {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('Требуется авторизация')
            }

            console.log(' Adding to favorites:', productId)

            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ product_id: productId })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Ошибка добавления в избранное')
            }

            await this.loadFavorites()
            return true
            
        } catch (error) {
            console.error(' Add to favorites error:', error)
            runInAction(() => {
                this._error = error.message
            })
            throw error
        }
    }

    async removeFromFavorites(productId) {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                throw new Error('Требуется авторизация')
            }

            console.log(' Removing from favorites:', productId)

            const response = await fetch(`/api/favorites/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Ошибка удаления из избранного')
            }

            runInAction(() => {
                this._favorites = this._favorites.filter(item => 
                    item.product_id !== productId && item.id !== productId
                )
            })
            
            return true
            
        } catch (error) {
            console.error(' Remove from favorites error:', error)
            runInAction(() => {
                this._error = error.message
            })
            throw error
        }
    }

    async checkIsFavorite(productId) {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                return false
            }

            const response = await fetch(`/api/favorites/check/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                return false
            }

            const data = await response.json()
            return data.isFavorite || false
            
        } catch (error) {
            console.error(' Check favorite error:', error)
            return false
        }
    }

    isFavorite(productId) {
        return this._favorites.some(item => 
            item.product_id === productId || item.id === productId
        )
    }

    clearError() {
        runInAction(() => {
            this._error = null
        })
    }

    get favorites() {
        return this._favorites
    }

    get loading() {
        return this._loading
    }

    get error() {
        return this._error
    }

    get favoritesCount() {
        return this._favorites.length
    }
}

export default FavoritesStore