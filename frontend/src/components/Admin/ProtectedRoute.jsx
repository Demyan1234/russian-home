import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AppContext } from '../../context/ContextProvider'
import { Spinner, Container, Alert } from 'react-bootstrap'

const ProtectedRoute = ({ 
    children, 
    requireAdmin = false, 
    requireManager = false,
    allowedRoles = []
}) => {
    const { user } = useContext(AppContext)

    console.log(' ProtectedRoute check:', {
        isAuth: user.isAuth,
        userRole: user.user?.role,
        requireAdmin,
        requireManager,
        allowedRoles
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
        return <Navigate to="/auth" replace />
    }

    if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.user?.role)) {
            return (
                <Container className="mt-4">
                    <Alert variant="danger">
                        <h4>Доступ запрещен</h4>
                        <p>Ваша роль: <strong>{user.user?.role}</strong></p>
                        <p>Требуемые роли: <strong>{allowedRoles.join(', ')}</strong></p>
                    </Alert>
                </Container>
            )
        }
    }

    if (requireAdmin && user.user?.role !== 'admin') {
        return (
            <Container className="mt-4">
                <Alert variant="danger">
                    <h4>Требуется роль администратора</h4>
                    <p>Ваша роль: <strong>{user.user?.role}</strong></p>
                </Alert>
            </Container>
        )
    }

    if (requireManager && !['manager', 'admin'].includes(user.user?.role)) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">
                    <h4>Требуется роль менеджера или администратора</h4>
                    <p>Ваша роль: <strong>{user.user?.role}</strong></p>
                </Alert>
            </Container>
        )
    }

    console.log(' Access granted')
    return children
}

export default ProtectedRoute