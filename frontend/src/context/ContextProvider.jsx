import React, { createContext, useEffect, useState } from 'react'
import UserStore from '../store/UserStore'
import CatalogStore from '../store/CatalogStore' 
import BasketStore from '../store/BasketStore'
import FavoritesStore from '../store/FavoritesStore' 

export const AppContext = createContext(null)

export const ContextProvider = ({ children }) => {
    const [stores, setStores] = useState(null)
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        console.log(' ContextProvider: Initializing stores...')
        
        const user = new UserStore()
        const catalog = new CatalogStore()
        const basket = new BasketStore()
        const favorites = new FavoritesStore() 

        const contextValue = {
            user: user || {},
            catalog: catalog || {}, 
            basket: basket || {},
            favorites: favorites || {} 
        }

        setStores(contextValue)
        setInitialized(true)

        if (basket && typeof basket.loadBasket === 'function') {
            basket.loadBasket().catch(error => {
                console.error('Basket load error in ContextProvider:', error)
            })
        }

        if (favorites && typeof favorites.loadFavorites === 'function') {
            favorites.loadFavorites().catch(error => {
                console.error('Favorites load error in ContextProvider:', error)
            })
        }

        return () => {
            console.log(' ContextProvider: Cleaning up...')
        }
    }, [])

    if (!initialized || !stores) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        )
    }

    return (
        <AppContext.Provider value={stores}>
            {children}
        </AppContext.Provider>
    )
}