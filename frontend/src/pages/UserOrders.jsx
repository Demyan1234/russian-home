import { observer } from 'mobx-react-lite'
import { Container, Spinner, Button, Alert, Table, Badge, Card } from 'react-bootstrap'
import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/ContextProvider'
import { useNavigate } from 'react-router-dom'
import { formatPrice, formatDate } from '../utils/utils'

const UserOrders = observer(() => {
    const { user } = useContext(AppContext)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadOrders = async () => {
            if (user.isAuth) {
                try {
                    setLoading(true)
                    setError('')
                    await user.loadUserOrders()
                } catch (err) {
                    setError(err.message)
                } finally {
                    setLoading(false)
                }
            }
        }

        loadOrders()
    }, [user.isAuth])

    const getStatusVariant = (status) => {
        switch (status) {
            case 'pending': return 'warning'
            case 'processing': return 'info'
            case 'shipped': return 'primary'
            case 'delivered': return 'success'
            case 'cancelled': return 'danger'
            default: return 'secondary'
        }
    }

    const getStatusText = (status) => {
        const statusMap = {
            'pending': 'Ожидание',
            'processing': 'Обработка',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        }
        return statusMap[status] || status
    }

    const handleViewOrder = (orderId) => {
        navigate(`/user/orders/${orderId}`)
    }

    const handlePayment = (orderId) => {
        navigate(`/payment/${orderId}`)
    }

    if (loading) {
        return (
            <Container className="d-flex justify-content-center mt-5">
                <Spinner animation="border" />
            </Container>
        )
    }

    return (
        <Container>
            <div className="d-flex justify-content-between align-items-center my-4">
                <h1>Мои заказы</h1>
            </div>
            
            {error && (
                <Alert variant="danger" className="mb-4">
                    <h5>Ошибка загрузки заказов</h5>
                    <p>{error}</p>
                    <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => window.location.reload()}
                    >
                        Попробовать снова
                    </Button>
                </Alert>
            )}
            
            
            {!loading && user.userOrders.length > 0 ? (
                <Card>
                    <Card.Header>
                        <h5 className="mb-0">История заказов</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table striped bordered hover responsive className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID заказа</th>
                                    <th>Дата создания</th>
                                    <th>Сумма</th>
                                    <th>Статус</th>
                                    <th>Оплата</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.userOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>
                                            <strong>#{order.id}</strong>
                                        </td>
                                        <td>
                                            {formatDate(order.created_at)}
                                            <br />
                                            <small className="text-muted">
                                                {new Date(order.created_at).toLocaleTimeString('ru-RU')}
                                            </small>
                                        </td>
                                        <td>
                                            <strong>{formatPrice(order.total_amount)}</strong>
                                        </td>
                                        <td>
                                            <Badge bg={getStatusVariant(order.status)}>
                                                {getStatusText(order.status)}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg={order.payment_status === 'paid' ? 'success' : 'warning'}>
                                                {order.payment_status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleViewOrder(order.id)}
                                                    title="Просмотреть детали заказа"
                                                >
                                                    Посмотреть
                                                </Button>
                                                {order.payment_status !== 'paid' && (
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handlePayment(order.id)}
                                                        title="Оплатить заказ"
                                                    >
                                                        Оплатить
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            ) : (
                
                <Card className="text-center py-5">
                    <Card.Body>
                        <div className="mb-4">
                            <h3></h3>
                        </div>
                        <h4>У вас пока нет заказов</h4>
                        <p className="text-muted mb-4">
                            Сделайте ваш первый заказ в нашем магазине и он появится здесь!
                        </p>
                        <div className="d-flex gap-3 justify-content-center">
                            <Button 
                                variant="primary"
                                onClick={() => navigate('/shop')}
                                size="lg"
                            >
                                Перейти к покупкам
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            )}
        </Container>
    )
})

export default UserOrders