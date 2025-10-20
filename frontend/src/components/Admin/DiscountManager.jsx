import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col, Alert, Table, Badge, Modal, InputGroup } from 'react-bootstrap'
import { observer } from 'mobx-react-lite'
import { fetchProducts } from '../../http/catalogAPI'

const DiscountManager = observer(() => {
    const [products, setProducts] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState(new Set())
    const [showDiscountModal, setShowDiscountModal] = useState(false)
    const [discountData, setDiscountData] = useState({
        discount_percent: '',
        discount_days: 7
    })

    const loadProducts = async () => {
        try {
            const data = await fetchProducts({ limit: 1000 })
            const productsList = data.data?.products || data.products || []
            setProducts(productsList)
            setFilteredProducts(productsList)
            console.log(' Загружены товары со статусами:', productsList.map(p => ({id: p.id, name: p.name, status: p.status})))
        } catch (error) {
            console.error('Error loading products:', error)
            setError('Ошибка загрузки товаров')
        }
    }

    useEffect(() => {
        loadProducts()
    }, [])

    useEffect(() => {
        if (searchTerm) {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            setFilteredProducts(filtered)
        } else {
            setFilteredProducts(products)
        }
    }, [searchTerm, products])

    const toggleProductSelection = (productId) => {
        setSelectedProducts(prev => {
            const newSelection = new Set(prev)
            if (newSelection.has(productId)) {
                newSelection.delete(productId)
            } else {
                newSelection.add(productId)
            }
            return newSelection
        })
    }

    const toggleSelectAll = () => {
        if (selectedProducts.size === filteredProducts.length) {
            setSelectedProducts(new Set())
        } else {
            setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
        }
    }

    const handleStatusUpdate = async (productId, newStatus) => {
        setLoading(true)
        setError('')
        setSuccess('')
        
        try {
            const token = localStorage.getItem('token')
            console.log(` Обновление статуса товара ${productId} на:`, newStatus)
            
            const response = await fetch(`http://localhost:3000/api/admin/products/${productId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    status: newStatus 
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка обновления статуса')
            }

            const result = await response.json()
            console.log(' Статус обновлен успешно:', result)
            
            setProducts(prev => prev.map(p => 
                p.id === productId ? { ...p, status: newStatus } : p
            ))
            
            setSuccess(`Статус товара обновлен на "${getStatusText(newStatus)}"`)
            
        } catch (error) {
            console.error(' Ошибка обновления статуса:', error)
            setError('Ошибка обновления статуса: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSetDiscount = async () => {
        if (selectedProducts.size === 0) {
            setError('Выберите товары для установки скидки')
            return
        }

        if (!discountData.discount_percent || discountData.discount_percent < 1 || discountData.discount_percent > 99) {
            setError('Введите корректный размер скидки (1-99%)')
            return
        }

        setLoading(true)
        setError('')
        
        try {
            const token = localStorage.getItem('token')
            const updates = []
            
            for (const productId of selectedProducts) {
                const startDate = new Date()
                const endDate = new Date()
                endDate.setDate(endDate.getDate() + parseInt(discountData.discount_days))
                
                const response = await fetch(`http://localhost:3000/api/admin/products/${productId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        discount_percent: parseInt(discountData.discount_percent),
                        discount_start: startDate.toISOString(),
                        discount_end: endDate.toISOString(),
                        status: 'sale' 
                    })
                })

                if (!response.ok) {
                    throw new Error(`Ошибка для товара ${productId}`)
                }
                
                updates.push(productId)
            }

            setSuccess(`Скидка установлена для ${updates.length} товаров. Статус изменен на "Распродажа"`)
            setShowDiscountModal(false)
            setDiscountData({ discount_percent: '', discount_days: 7 })
            setSelectedProducts(new Set())
            
            await loadProducts()
            
        } catch (error) {
            setError('Ошибка установки скидки: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResetDiscount = async () => {
        if (selectedProducts.size === 0) {
            setError('Выберите товары для сброса скидки')
            return
        }

        setLoading(true)
        setError('')
        
        try {
            const token = localStorage.getItem('token')
            let resetCount = 0
            
            for (const productId of selectedProducts) {
                const response = await fetch(`http://localhost:3000/api/admin/products/${productId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        discount_percent: 0,
                        discount_start: null,
                        discount_end: null,
                        status: 'default' 
                    })
                })

                if (response.ok) {
                    resetCount++
                }
            }

            setSuccess(`Скидка сброшена для ${resetCount} товаров. Статус изменен на "Обычный"`)
            setSelectedProducts(new Set())
            await loadProducts()
            
        } catch (error) {
            setError('Ошибка сброса скидки: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAutoUpdate = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3000/api/admin/update-product-statuses', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()
            if (data.success) {
                setSuccess(`Автообновление выполнено! Сброшено скидок: ${data.stats.expiredDiscounts}, Обновлено статусов: ${data.stats.outOfStock}`)
                await loadProducts()
            }
        } catch (error) {
            setError('Ошибка автообновления: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const variants = {
            'new': 'success',      
            'hit': 'danger',       
            'sale': 'warning',     
            'out_of_stock': 'secondary', 
            'default': 'primary'   
        }
        return variants[status] || 'secondary'
    }

    const getStatusText = (status) => {
        const statusMap = {
            'new': ' Новинка',
            'hit': ' Хит',
            'sale': ' Распродажа',
            'out_of_stock': ' Нет в наличии',
            'default': ' Обычный'
        }
        return statusMap[status] || status
    }

    const getStatusButtonVariant = (productStatus, targetStatus) => {
        return productStatus === targetStatus ? 
            getStatusBadge(targetStatus) : 
            `outline-${getStatusBadge(targetStatus)}`
    }

    return (
        <div>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
            <Card className="mb-4">
                <Card.Header>
                    <h5 className="mb-0"> Управление скидками и статусами</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={6}>
                            <div className="d-flex gap-2 flex-wrap">
                                <Button 
                                    variant="outline-primary"
                                    onClick={handleAutoUpdate}
                                    disabled={loading}
                                >
                                    Автообновление
                                </Button>
                                
                                <Button 
                                    variant="warning"
                                    onClick={() => setShowDiscountModal(true)}
                                    disabled={loading || selectedProducts.size === 0}
                                >
                                    Скидка на выбранные ({selectedProducts.size})
                                </Button>
                                
                                <Button 
                                    variant="outline-danger"
                                    onClick={handleResetDiscount}
                                    disabled={loading || selectedProducts.size === 0}
                                >
                                    Сбросить скидки
                                </Button>
                            </div>
                        </Col>
                        
                        <Col md={6}>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Поиск товаров..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => setSearchTerm('')}
                                >
                                    ✕
                                </Button>
                            </InputGroup>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* СПИСОК ТОВАРОВ */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        Товары ({filteredProducts.length})
                        {selectedProducts.size > 0 && (
                            <Badge bg="primary" className="ms-2">
                                Выбрано: {selectedProducts.size}
                            </Badge>
                        )}
                    </h5>
                    <Form.Check
                        type="checkbox"
                        label="Выбрать все"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleSelectAll}
                    />
                </Card.Header>
                <Card.Body>
                    <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th width="50px">Выбор</th>
                                    <th>Товар</th>
                                    <th>Цена</th>
                                    <th>Статус</th>
                                    <th>Скидка</th>
                                    <th>Склад</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className={!product.is_active ? 'table-secondary' : ''}>
                                        <td>
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedProducts.has(product.id)}
                                                onChange={() => toggleProductSelection(product.id)}
                                            />
                                        </td>
                                        <td>
                                            <div>
                                                <strong>{product.name}</strong>
                                                <br />
                                                <small className="text-muted">
                                                    {product.category_name} • {product.brand_name}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                {product.discount_percent > 0 ? (
                                                    <>
                                                        <span className="text-success fw-bold">
                                                            {Math.round(product.price * (1 - product.discount_percent / 100))} руб.
                                                        </span>
                                                        <br />
                                                        <small className="text-muted text-decoration-line-through">
                                                            {product.price} руб.
                                                        </small>
                                                    </>
                                                ) : (
                                                    <span>{product.price} руб.</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {/* ОТОБРАЖЕНИЕ ТЕКУЩЕГО СТАТУСА */}
                                            <Badge bg={getStatusBadge(product.status)}>
                                                {getStatusText(product.status)}
                                            </Badge>
                                        </td>
                                        <td>
                                            {product.discount_percent > 0 ? (
                                                <div>
                                                    <Badge bg="success">{product.discount_percent}%</Badge>
                                                    {product.discount_end && (
                                                        <div className="text-muted small">
                                                            до {new Date(product.discount_end).toLocaleDateString('ru-RU')}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge 
                                                bg={product.stock_quantity > 5 ? 'success' : 
                                                    product.stock_quantity > 0 ? 'warning' : 'danger'}
                                            >
                                                {product.stock_quantity} шт.
                                            </Badge>
                                        </td>
                                        <td>
                                            {/*  КНОПКИ С АКТИВНЫМ СОСТОЯНИЕМ */}
                                            <div className="d-flex flex-wrap gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={getStatusButtonVariant(product.status, 'new')}
                                                    onClick={() => handleStatusUpdate(product.id, 'new')}
                                                    disabled={loading}
                                                >
                                                    Новинка
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={getStatusButtonVariant(product.status, 'hit')}
                                                    onClick={() => handleStatusUpdate(product.id, 'hit')}
                                                    disabled={loading}
                                                >
                                                    Хит
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={getStatusButtonVariant(product.status, 'default')}
                                                    onClick={() => handleStatusUpdate(product.id, 'default')}
                                                    disabled={loading}
                                                >
                                                    Обычный
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* МОДАЛЬНОЕ ОКНО УСТАНОВКИ СКИДКИ */}
            <Modal show={showDiscountModal} onHide={() => setShowDiscountModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Установка скидки для {selectedProducts.size} товаров
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Размер скидки (%) *</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            max="99"
                            value={discountData.discount_percent}
                            onChange={(e) => setDiscountData(prev => ({
                                ...prev,
                                discount_percent: e.target.value
                            }))}
                            required
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Дней действия скидки</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            value={discountData.discount_days}
                            onChange={(e) => setDiscountData(prev => ({
                                ...prev,
                                discount_days: parseInt(e.target.value)
                            }))}
                        />
                        <Form.Text className="text-muted">
                            По истечении этого времени скидка автоматически сбросится
                        </Form.Text>
                    </Form.Group>

                    <Alert variant="info">
                        <strong>Внимание:</strong> При установке скидки статус товара автоматически изменится на " Распродажа"
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDiscountModal(false)}>
                        Отмена
                    </Button>
                    <Button 
                        variant="warning" 
                        onClick={handleSetDiscount}
                        disabled={loading || !discountData.discount_percent}
                    >
                        {loading ? 'Установка...' : 'Установить скидку'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
})

export default DiscountManager