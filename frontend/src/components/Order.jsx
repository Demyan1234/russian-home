import { Card, Table, Badge, Row, Col } from 'react-bootstrap'

const Order = ({ data, admin = false }) => {
    const getStatusVariant = (status) => {
        switch (status) {
            case 'delivered': return 'success'
            case 'processing': return 'primary' 
            case 'shipped': return 'info'
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

    return (
        <Card className="mt-4">
            <Card.Header>
                <h4>Заказ №{data.id}</h4>
                <Badge bg={getStatusVariant(data.status)}>
                    {getStatusText(data.status)}
                </Badge>
            </Card.Header>
            <Card.Body>
                <Row>
                    <Col md={6}>
                        <h5>Информация о заказе</h5>
                        <p><strong>Дата:</strong> {new Date(data.created_at).toLocaleDateString('ru-RU')}</p>
                        <p><strong>Сумма:</strong> {data.total_amount} руб.</p>
                        <p><strong>Способ доставки:</strong> {data.shipping_method === 'cdek' ? 'СДЭК' : 'Почта России'}</p>
                        {data.comment && <p><strong>Комментарий:</strong> {data.comment}</p>}
                    </Col>
                    <Col md={6}>
                        <h5>Данные покупателя</h5>
                        <p><strong>Имя:</strong> {data.customer_name}</p>
                        <p><strong>Телефон:</strong> {data.customer_phone}</p>
                        <p><strong>Email:</strong> {data.customer_email}</p>
                        <p><strong>Адрес:</strong> {data.shipping_address}</p>
                    </Col>
                </Row>

                <h5 className="mt-4">Состав заказа</h5>
                <Table striped bordered>
                    <thead>
                        <tr>
                            <th>Товар</th>
                            <th>Цена</th>
                            <th>Количество</th>
                            <th>Сумма</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items && data.items.map((item, index) => (
                            <tr key={index}>
                                <td>{item.name}</td>
                                <td>{item.price} руб.</td>
                                <td>{item.quantity}</td>
                                <td>{(item.price * item.quantity).toFixed(2)} руб.</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="3" className="text-end"><strong>Итого:</strong></td>
                            <td><strong>{data.total_amount} руб.</strong></td>
                        </tr>
                    </tfoot>
                </Table>
            </Card.Body>
        </Card>
    )
}

export default Order