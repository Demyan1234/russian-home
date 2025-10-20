import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AppContext } from '../../context/ContextProvider'
import { Spinner, Container } from 'react-bootstrap'

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user } = useContext(AppContext)

    console.log(' ProtectedRoute check:', {
        isAuth: user.isAuth,
        isAdmin: user.isAdmin,
        requireAdmin,
        user: user.user
    })

    if (user.isAuth === undefined) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" variant="primary" />
                <span className="ms-2">Проверка авторизации...</span>
            </Container>
        )
    }

    if (!user.isAuth) {
        console.log(' Not authenticated, redirecting to login')
        return <Navigate to="/login" replace />
    }

    if (requireAdmin && !user.isAdmin) {
        console.log(' Not admin, redirecting to shop')
        return <Navigate to="/shop" replace />
    }

    console.log(' Access granted')
    return children
}

export default ProtectedRoute