import { Routes, Route, Navigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useContext } from 'react'
import { AppContext } from '../context/ContextProvider'

import HomePage from '../pages/HomePage'
import Shop from '../pages/Shop'
import Auth from '../pages/Auth'
import Admin from '../pages/Admin'
import Basket from '../pages/Basket'
import Product from '../pages/Product'
import Checkout from '../pages/Checkout'
import UserOrders from '../pages/UserOrders'
import UserOrder from '../pages/UserOrder'
import OrderSuccess from '../pages/OrderSuccess'
import Favorites from '../pages/Favorites'

const AppRouter = observer(() => {
    const { user } = useContext(AppContext)

    if (user.isAuth === undefined) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        )
    }

    return (
        <Routes>
            
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/registration" element={<Auth />} />
            <Route path="/order/success" element={<OrderSuccess />} />
            
            <Route 
                path="/basket" 
                element={user.isAuth ? <Basket /> : <Navigate to="/login" replace />} 
            />
            <Route 
                path="/checkout" 
                element={user.isAuth ? <Checkout /> : <Navigate to="/login" replace />} 
            />
            <Route 
                path="/user/orders" 
                element={user.isAuth ? <UserOrders /> : <Navigate to="/login" replace />} 
            />
            <Route 
                path="/user/orders/:id" 
                element={user.isAuth ? <UserOrder /> : <Navigate to="/login" replace />} 
            />
            <Route 
                path="/favorites" 
                element={user.isAuth ? <Favorites /> : <Navigate to="/login" replace />} 
            />
            <Route 
                path="/admin/*" 
                element={user.isAdmin ? <Admin /> : <Navigate to="/" replace />} 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
})

export default AppRouter