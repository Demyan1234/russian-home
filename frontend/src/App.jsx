import { observer } from 'mobx-react-lite'
import { BrowserRouter } from 'react-router-dom'
import { useEffect, useContext } from 'react'
import AppRouter from './components/AppRouter'
import NavBar from './components/NavBar'
import Breadcrumbs from './components/Breadcrumbs'
import Footer from './components/Footer'
import { AppContext } from './context/ContextProvider'
import './css/product-gallery.css';

const App = observer(() => {
    const context = useContext(AppContext)
    
    if (!context) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        )
    }

    const { user, basket } = context

    useEffect(() => {
        console.log(' App: Checking auth on mount')
        user.checkAuth().then((isAuthenticated) => {
            if (isAuthenticated) {
                if (basket && typeof basket.loadBasket === 'function') {
                    basket.loadBasket().catch(error => {
                        console.error('Basket load error:', error)
                    })
                }
                
                if (typeof user.loadUserOrders === 'function') {
                    user.loadUserOrders().catch(error => {
                        console.error('User orders load error:', error)
                    })
                }
            }
        }).catch(error => {
            console.error('Auth check error:', error)
        })
    }, [user, basket])

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh' 
        }}>
            <BrowserRouter>
                <NavBar />
                <Breadcrumbs />
                <div style={{ flex: '1 0 auto' }}>
                    <AppRouter />
                </div>
                <Footer />
            </BrowserRouter>
        </div>
    )
})

export default App