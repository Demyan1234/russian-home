import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { Table, Button, Badge, Card, Modal, Form, Alert, Row, Col } from 'react-bootstrap'
import { updateOrderStatus, adminGetOne } from '../http/orderAPI'

const Orders = observer(({ items = [], admin = false, onUpdate }) => {
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [orderDetails, setOrderDetails] = useState(null)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [newStatus, setNewStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const [error, setError] = useState('')

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

    const handleStatusChange = async () => {
        if (!selectedOrder || !newStatus) return

        setLoading(true)
        setError('')

        try {
            await updateOrderStatus(selectedOrder.id, newStatus)
            setShowStatusModal(false)
            setSelectedOrder(null)
            setNewStatus('')
            
            if (onUpdate) {
                onUpdate()
            }
            
            alert('Статус заказа успешно обновлен!')
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const openStatusModal = (order) => {
        setSelectedOrder(order)
        setNewStatus(order.status)
        setShowStatusModal(true)
        setError('')
    }

    const openDetailsModal = async (order) => {
        setSelectedOrder(order)
        setDetailsLoading(true)
        setError('')

        try {
            const details = await adminGetOne(order.id)
            setOrderDetails(details)
            setShowDetailsModal(true)
        } catch (error) {
            setError(error.message)
        } finally {
            setDetailsLoading(false)
        }
    }

    const closeDetailsModal = () => {
        setShowDetailsModal(false)
        setOrderDetails(null)
        setSelectedOrder(null)
    }

    if (!items || items.length === 0) {
        return (
            <Card>
                <Card.Body className="text-center text-muted">
                    <h5>Заказы не найдены</h5>
                    <p>Пока нет ни одного заказа</p>
                </Card.Body>
            </Card>
        )
    }

    return (
        <>
            <Table bordered hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Дата</th>
                        {admin && <th>Клиент</th>}
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Оплата</th>
                        {admin && <th>Действия</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.map(order => (
                        <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td>
                                {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                <br />
                                <small className="text-muted">
                                    {new Date(order.created_at).toLocaleTimeString('ru-RU')}
                                </small>
                            </td>
                            {admin && (
                                <td>
                                    <div>
                                        <strong>{order.customer_name}</strong>
                                        <br />
                                        <small className="text-muted">{order.customer_email}</small>
                                        {order.customer_phone && (
                                        
                                            <small className="text-muted">{order.customer_phone}</small>
                                        )}
                                    </div>
                                </td>
                            )}
                            <td>
                                <strong>{order.total_amount} руб.</strong>
                            </td>
                            <td>
                                <Badge bg={getStatusVariant(order.status)}>
                                    {getStatusText(order.status)}
                                </Badge>
                            </td>
                            <td>
                                <Badge bg={order.payment_status === 'paid' ? 'success' : 'warning'}>
                                    {order.payment_status === 'paid' ? 'Оплачен' : 'Ожидает'}
                                </Badge>
                            </td>
                            {admin && (
                                <td>
                                    <div className="d-flex gap-2">
                                        <Button
                                            variant="outline-info"
                                            size="sm"
                                            onClick={() => openDetailsModal(order)}
                                            title="Просмотр деталей заказа"
                                        >
                                            Детали
                                        </Button>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => openStatusModal(order)}
                                            title="Изменить статус"
                                        >
                                            Статус
                                        </Button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showDetailsModal} onHide={closeDetailsModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Детали заказа #{selectedOrder?.id}
                        {detailsLoading && <span className="spinner-border spinner-border-sm ms-2"></span>}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    {orderDetails && (
                        <div>
                            <Card className="mb-3">
                                <Card.Header>
                                    <h6 className="mb-0">Информация о заказе</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Клиент:</strong> {orderDetails.customer_name}</p>
                                            <p><strong>Email:</strong> {orderDetails.customer_email}</p>
                                            <p><strong>Телефон:</strong> {orderDetails.customer_phone || 'Не указан'}</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Статус:</strong> 
                                                <Badge bg={getStatusVariant(orderDetails.status)} className="ms-2">
                                                    {getStatusText(orderDetails.status)}
                                                </Badge>
                                            </p>
                                            <p><strong>Оплата:</strong> 
                                                <Badge bg={orderDetails.payment_status === 'paid' ? 'success' : 'warning'} className="ms-2">
                                                    {orderDetails.payment_status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                                                </Badge>
                                            </p>
                                            <p><strong>Сумма:</strong> {orderDetails.total_amount} руб.</p>
                                        </Col>
                                    </Row>
                                    
                                    {orderDetails.shipping_address && (
                                        <p><strong>Адрес доставки:</strong> {orderDetails.shipping_address}</p>
                                    )}
                                    
                                    {orderDetails.shipping_method && (
                                        <p><strong>Способ доставки:</strong> {orderDetails.shipping_method}</p>
                                    )}
                                    
                                    {orderDetails.comment && (
                                        <p><strong>Комментарий:</strong> {orderDetails.comment}</p>
                                    )}
                                </Card.Body>
                            </Card>

                            <Card>
                                <Card.Header>
                                    <h6 className="mb-0">Товары в заказе</h6>
                                </Card.Header>
                                <Card.Body>
                                    {orderDetails.items && orderDetails.items.length > 0 ? (
                                        <Table striped bordered size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Товар</th>
                                                    <th>Цена</th>
                                                    <th>Кол-во</th>
                                                    <th>Сумма</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderDetails.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <div>
                                                                <strong>{item.name}</strong>
                                                                {item.description && (
                                                                    <div className="text-muted small">
                                                                        {item.description.length > 100 
                                                                            ? item.description.substring(0, 100) + '...' 
                                                                            : item.description
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>{item.price} руб.</td>
                                                        <td>{item.quantity} шт.</td>
                                                        <td><strong>{(item.price * item.quantity).toFixed(2)} руб.</strong></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan="3" className="text-end"><strong>Итого:</strong></td>
                                                    <td><strong>{orderDetails.total_amount} руб.</strong></td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    ) : (
                                        <p className="text-muted">Товары не найдены</p>
                                    )}
                                </Card.Body>
                            </Card>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDetailsModal}>
                        Закрыть
                    </Button>
                    <Button 
                        variant="primary"
                        onClick={() => {
                            closeDetailsModal()
                            openStatusModal(selectedOrder)
                        }}
                    >
                        Изменить статус
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Изменение статуса заказа #{selectedOrder?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    {selectedOrder && (
                        <div className="mb-3">
                            <p><strong>Клиент:</strong> {selectedOrder.customer_name}</p>
                            <p><strong>Текущий статус:</strong> {getStatusText(selectedOrder.status)}</p>
                        </div>
                    )}
                    
                    <Form.Group>
                        <Form.Label>Новый статус:</Form.Label>
                        <Form.Select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="pending">Ожидание</option>
                            <option value="processing">Обработка</option>
                            <option value="shipped">Отправлен</option>
                            <option value="delivered">Доставлен</option>
                            <option value="cancelled">Отменен</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowStatusModal(false)}
                    >
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleStatusChange}
                        disabled={loading || !newStatus}
                    >
                        {loading ? 'Обновление...' : 'Обновить статус'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    )
})

export default Orders