import { useContext } from 'react'
import { Routes, Route } from "react-router-dom"
import { AppContext } from "../context/ContextProvider"

import HomePage from "../pages/HomePage"
import Shop from "../pages/Shop"
import Auth from "../pages/Auth"
import Basket from "../pages/Basket"
import Product from "../pages/Product"
import Favorites from "../pages/Favorites"
import Checkout from "../pages/Checkout"
import OrderSuccess from "../pages/OrderSuccess"
import PaymentTest from "../pages/PaymentTest"
import UserOrders from "../pages/UserOrders"
import UserOrder from "../pages/UserOrder"

import Admin from "../pages/Admin"
import Manager from "../pages/Manager"

import EmailVerification from "../pages/EmailVerification"
import ResendVerification from "../pages/ResendVerification"
import EmailCodeVerification from "../pages/EmailCodeVerification"

import ProtectedRoute from "./Admin/ProtectedRoute"

const AppRouter = () => {
    const { user } = useContext(AppContext)

    console.log('AppRouter: User auth state:', {
        isAuth: user.isAuth,
        isAdmin: user.isAdmin,
        isManager: user.isManager,
        emailVerified: user.emailVerified
    })

    return (
        <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/registration" element={<Auth />} />
            <Route path="/verify-code" element={<EmailCodeVerification />} />
            {/* Email верификация */}
            <Route path="/login" element={<Auth />} />
            <Route path="/registration" element={<Auth />} />
            <Route path="/verify-code" element={<EmailCodeVerification />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/resend-verification" element={<ResendVerification />} />

            {/* Защищенные маршруты для всех авторизованных */}
            <Route path="/basket" element={
                <ProtectedRoute>
                    <Basket />
                </ProtectedRoute>
            } />
            <Route path="/favorites" element={
                <ProtectedRoute>
                    <Favorites />
                </ProtectedRoute>
            } />
            <Route path="/orders" element={
                <ProtectedRoute>
                    <UserOrders />
                </ProtectedRoute>
            } />
            <Route path="/orders/:id" element={
                <ProtectedRoute>
                    <UserOrder />
                </ProtectedRoute>
            } />
            <Route path="/checkout" element={
                <ProtectedRoute>
                    <Checkout />
                </ProtectedRoute>
            } />
            <Route path="/order/success" element={
                <ProtectedRoute>
                    <OrderSuccess />
                </ProtectedRoute>
            } />
            <Route path="/payment-test" element={
                <ProtectedRoute>
                    <PaymentTest />
                </ProtectedRoute>
            } />
            

<Route path="/admin" element={
    <ProtectedRoute allowedRoles={['admin']}>
        <Admin />
    </ProtectedRoute>
} />


<Route path="/manager" element={
    <ProtectedRoute allowedRoles={['manager', 'admin']}>
        <Manager />
    </ProtectedRoute>
} />


            <Route path="*" element={<Shop />} />
        </Routes>
    )
}

export default AppRouter