import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import { Row, Col, Card, Table, Badge } from 'react-bootstrap'
import { fetchAdminStats } from '../../http/catalogAPI'

const AdminStats = observer(({ detailed = false }) => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
        recentOrders: [],
        lowStockProducts: [],
        popularProducts: [],
        todayOrders: 0,
        monthlyRevenue: 0
    })

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true)
                const data = await fetchAdminStats()
                setStats(data.data || data)
            } catch (error) {
                console.error('Error loading stats:', error)
                setStats({
                    totalProducts: 0,
                    totalOrders: 0,
                    totalUsers: 0,
                    totalRevenue: 0,
                    recentOrders: [],
                    lowStockProducts: [],
                    popularProducts: [],
                    todayOrders: 0,
                    monthlyRevenue: 0
                })
            } finally {
                setLoading(false)
            }
        }
        loadStats()

        const interval = setInterval(loadStats, 30000)
        return () => clearInterval(interval)
    }, [])

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

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка статистики...</span>
                </div>
                <p className="mt-2">Загрузка статистики...</p>
            </div>
        )
    }

return (
        <div className="mb-4">
            <Row>
                <Col md={3} className="mb-3">
                    <Card className="text-center border-primary">
                        <Card.Body>
                            <Card.Title className="text-primary">
                                Товары
                            </Card.Title>
                            <h3 className="text-primary">{stats.totalProducts}</h3>
                            <small className="text-muted">в каталоге</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} className="mb-3">
                    <Card className="text-center border-success">
                        <Card.Body>
                            <Card.Title className="text-success">
                                Заказы
                            </Card.Title>
                            <h3 className="text-success">{stats.totalOrders}</h3>
                            <small className="text-muted">всего заказов</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} className="mb-3">
                    <Card className="text-center border-info">
                        <Card.Body>
                            <Card.Title className="text-info">
                                Пользователи
                            </Card.Title>
                            <h3 className="text-info">{stats.totalUsers}</h3>
                            <small className="text-muted">зарегистрировано</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3} className="mb-3">
                    <Card className="text-center border-warning">
                        <Card.Body>
                            <Card.Title className="text-warning">
                                Выручка
                            </Card.Title>
                            <h3 className="text-warning">{stats.totalRevenue.toLocaleString('ru-RU')} ₽</h3>
                            <small className="text-muted">общая выручка</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {detailed && (
                <Row className="mt-3">
                    <Col md={6} className="mb-3">
                        <Card className="text-center border-danger">
                            <Card.Body>
                                <Card.Title className="text-danger">
                                    Заказы сегодня
                                </Card.Title>
                                <h3 className="text-danger">{stats.todayOrders || 0}</h3>
                                <small className="text-muted">новых заказов</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={6} className="mb-3">
                        <Card className="text-center border-success">
                            <Card.Body>
                                <Card.Title className="text-success">
                                    Выручка за месяц
                                </Card.Title>
                                <h3 className="text-success">{stats.monthlyRevenue?.toLocaleString('ru-RU') || 0} ₽</h3>
                                <small className="text-muted">текущий месяц</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {detailed && stats.popularProducts && stats.popularProducts.length > 0 && (
                <Row className="mt-4">
                    <Col>
                        <Card>
                            <Card.Header className="bg-success text-white">
                                <h5 className="mb-0">
                                    Популярные товары
                                </h5>
                            </Card.Header>
                            <Card.Body>
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>Товар</th>
                                            <th>Продажи</th>
                                            <th>Выручка</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.popularProducts.map(product => (
                                            <tr key={product.id}>
                                                <td>{product.name}</td>
                                                <td>
                                                    <Badge bg="primary">{product.sales_count} шт.</Badge>
                                                </td>
                                                <td className="fw-bold text-success">
                                                    {product.total_revenue ? product.total_revenue.toLocaleString('ru-RU') : 0} ₽
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    )
})

export default AdminStats