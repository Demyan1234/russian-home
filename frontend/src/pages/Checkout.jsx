import { observer } from 'mobx-react-lite'
import { Container, Form, Button, Card, Row, Col, Alert } from 'react-bootstrap'
import { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/ContextProvider'
import { useNavigate } from 'react-router-dom'
import { userCreate } from '../http/orderAPI'
import { SHOP_ROUTE } from '../utils/consts'
import PaymentButton from '../components/PaymentButton'

const Checkout = observer(() => {
    const context = useContext(AppContext)
    const navigate = useNavigate()
    
    const user = context?.user || {}
    const basket = context?.basket || {}
    
    const basketProducts = basket?.products || []
    const totalAmount = basket?.totalAmount || 0
    const isAuth = user?.isAuth === true
    
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        shipping_address: '',
        shipping_method: 'cdek',
        comment: ''
    })
    
    const [createdOrderId, setCreatedOrderId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [orderCreated, setOrderCreated] = useState(false)
    const [orderData, setOrderData] = useState(null) 

    useEffect(() => {
        if (isAuth && user.user) {
            setFormData(prev => ({
                ...prev,
                customer_name: user.user.name || '',
                customer_email: user.user.email || '',
                customer_phone: user.user.phone || ''
            }))
        }
    }, [isAuth, user.user])

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const orderResponse = await userCreate(formData)
            console.log('Order created:', orderResponse)
            
            if (orderResponse.success && orderResponse.data) {
                setCreatedOrderId(orderResponse.data.orderId)
                setOrderData(orderResponse.data) 
                setOrderCreated(true)
                
                
                if (basket && typeof basket.clearBasket === 'function') {
                    basket.clearBasket()
                }
                
            } else {
                throw new Error('Не удалось создать заказ')
            }

        } catch (err) {
            setError(err.message)
            alert('Ошибка создания заказа: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleContinueShopping = () => {
        navigate(SHOP_ROUTE)
    }

    
    if (!orderCreated && (!Array.isArray(basketProducts) || basketProducts.length === 0)) {
        return (
            <Container className="text-center mt-5">
                <h2>Корзина пуста</h2>
                <p className="text-muted mb-4">Добавьте товары в корзину перед оформлением заказа</p>
                <Button onClick={() => navigate(SHOP_ROUTE)}>
                    Вернуться к покупкам
                </Button>
            </Container>
        )
    }

    
    return (
        <Container>
            <h1 className="my-4">
                {orderCreated ? 'Оплата заказа' : 'Оформление заказа'}
            </h1>
            
            <Row>
                <Col md={8}>
                    <Card>
                        <Card.Body>
                            {!orderCreated ? (
                                <Form onSubmit={handleSubmit}>
                                    {error && <Alert variant="danger">{error}</Alert>}
                                    
                                    <Form.Group className="mb-3">
                                        <Form.Label>ФИО *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="customer_name"
                                            value={formData.customer_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Email *</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="customer_email"
                                            value={formData.customer_email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Телефон *</Form.Label>
                                        <Form.Control
                                            type="tel"
                                            name="customer_phone"
                                            value={formData.customer_phone}
                                            onChange={handleChange}
                                            placeholder="+7 (999) 999-99-99"
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Адрес доставки *</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="shipping_address"
                                            value={formData.shipping_address}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Способ доставки</Form.Label>
                                        <Form.Select
                                            name="shipping_method"
                                            value={formData.shipping_method}
                                            onChange={handleChange}
                                        >
                                            <option value="cdek">СДЭК</option>
                                            <option value="russian_post">Почта России</option>
                                        </Form.Select>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Комментарий к заказу</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="comment"
                                            value={formData.comment}
                                            onChange={handleChange}
                                        />
                                    </Form.Group>

                                    <Button 
                                        type="submit" 
                                        variant="primary" 
                                        size="lg"
                                        disabled={loading}
                                    >
                                        {loading ? 'Создание заказа...' : 'Создать заказ'}
                                    </Button>
                                </Form>
                            ) : (
                                
                                <div>
                                    <Alert variant="success">
                                        <h4> Заказ #{createdOrderId} успешно создан!</h4>
                                        <p className="mb-0">
                                            Сумма к оплате: <strong>{orderData?.total_amount || totalAmount} руб.</strong>
                                        </p>
                                        {orderData?.estimatedDelivery && (
                                            <p className="mb-0 mt-2">
                                                <small>
                                                    Примерная дата доставки: {new Date(orderData.estimatedDelivery).toLocaleDateString('ru-RU')}
                                                </small>
                                            </p>
                                        )}
                                    </Alert>
                                    
                                    <div className="d-flex gap-3 mt-4">
                                        <PaymentButton
                                            orderId={createdOrderId}
                                            amount={orderData?.total_amount || totalAmount}
                                            description={`Оплата заказа #${createdOrderId}`}
                                            onSuccess={() => {
                                                alert(' Оплата прошла успешно! Заказ передан в обработку.')
                                                navigate(SHOP_ROUTE)
                                            }}
                                            onError={(error) => {
                                                alert(` Ошибка оплаты: ${error}`)
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
})

export default Checkout