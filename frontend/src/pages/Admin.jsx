import { observer } from 'mobx-react-lite'
import { useState, useContext, useEffect } from 'react'
import { Container, Button, Table, Row, Col, Card, Nav, Tab, Badge } from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'
import CreateProduct from '../components/Admin/CreateProduct'
import UpdateProduct from '../components/UpdateProduct'
import CreateCategory from '../components/Admin/CreateCategory'
import CreateBrand from '../components/Admin/CreateBrand'
import Orders from '../components/Orders'
import AdminStats from '../components/Admin/AdminStats'
import CategoriesList from '../components/Admin/CategoriesList'
import BrandsList from '../components/Admin/BrandsList'
import { fetchAllProducts, deleteProduct, fetchAllCategories, fetchAllBrands, fetchAdminProducts } from '../http/catalogAPI'
import { adminGetAll } from '../http/orderAPI'
import ProtectedRoute from '../components/Admin/ProtectedRoute'
import FilterManager from '../components/Admin/FilterManager'
import DiscountManager from '../components/Admin/DiscountManager'

const Admin = observer(() => {
    const { user } = useContext(AppContext)
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [orders, setOrders] = useState([])
    const [activeTab, setActiveTab] = useState('stats')
    const [createShow, setCreateShow] = useState(false)
    const [updateShow, setUpdateShow] = useState(false)
    const [categoryShow, setCategoryShow] = useState(false)
    const [brandShow, setBrandShow] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [change, setChange] = useState(false)
    const [loading, setLoading] = useState(false)

    const loadData = async () => {
    setLoading(true)
    try {
        if (activeTab === 'products') {
            const productsData = await fetchAdminProducts()  
            setProducts(productsData.data || productsData.products || [])
        } else if (activeTab === 'categories') {
            const categoriesData = await fetchAllCategories()
            setCategories(categoriesData.data || categoriesData || [])
        } else if (activeTab === 'brands') {
            const brandsData = await fetchAllBrands()
            setBrands(brandsData.data || brandsData || [])
        } else if (activeTab === 'orders') {
            const ordersData = await adminGetAll()
            setOrders(Array.isArray(ordersData) ? ordersData : [])
        }
    } catch (error) {
        console.error('Error loading data:', error)
    } finally {
        setLoading(false)
    }
}

    useEffect(() => {
        loadData()
    }, [activeTab, change])

const handleDelete = async (id, productName = 'товар') => {
    if (window.confirm(`Удалить товар "${productName}"?`)) {
        try {
            console.log(' Admin: Starting delete for product:', id);
            const result = await deleteProduct(id);
            
            if (result.success) {
                if (result.action === 'deactivated') {
                    alert(`Товар "${productName}" деактивирован (присутствует в заказах)`);
                } else {
                    alert(`Товар "${productName}" успешно удален`);
                }
                
                setChange(prev => !prev);
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
            
        } catch (error) {
            console.error(' Admin: Delete error:', error);
            alert('Ошибка удаления: ' + error.message);
        }
    }
};

    return (
        <ProtectedRoute requireAdmin={true}>
            <Container className="mt-4">
                <Row>
                    <Col>
                        <h1>Панель администратора</h1>
                        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                            <Card>
                                <Card.Header>
                                    <Nav variant="tabs" className="card-header-tabs">
                                        <Nav.Item>
                                            <Nav.Link eventKey="stats"> Статистика</Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="products"> Товары</Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="orders"> Заказы</Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="filters"> Фильтры</Nav.Link>
                                        </Nav.Item>
                                                <Nav.Item>
                                            <Nav.Link eventKey="discounts"> Скидки</Nav.Link>
                                        </Nav.Item>
                                    </Nav>
                                </Card.Header>
                                
                                <Card.Body>
                                    <Tab.Content>
                                        {/* Вкладка статистики */}
                                        <Tab.Pane eventKey="stats">
                                            <AdminStats detailed={true} />
                                        </Tab.Pane>
                                        {/* Вкладка товаров */}
                                        <Tab.Pane eventKey="products">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h4>Управление товарами ({products.length})</h4>
                                                <Button 
                                                    variant="success" 
                                                    onClick={() => setCreateShow(true)}
                                                >
                                                    + Добавить товар
                                                </Button>
                                            </div>
                                            {loading ? (
                                                <div className="text-center p-4">
                                                    <div className="spinner-border text-primary" role="status">
                                                        <span className="visually-hidden">Загрузка...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Table bordered hover responsive>
                                                    <thead>
                                                        <tr>
                                                            <th>ID</th>
                                                            <th>Название</th>
                                                            <th>Цена</th>
                                                            <th>Категория</th>
                                                            <th>Бренд</th>
                                                            <th>На складе</th>
                                                            <th>Действия</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {products.map(product => (
                                                            <tr key={product.id}>
                                                                <td>{product.id}</td>
                                                                <td>
                                                                    <strong>{product.name}</strong>
                                                                    {product.discount_percent > 0 && (
                                                                        <Badge bg="danger" className="ms-2">
                                                                            -{product.discount_percent}%
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td>{product.price} руб.</td>
                                                                <td>{product.category_name || '-'}</td>
                                                                <td>{product.brand_name || '-'}</td>
                                                                <td>
                                                                    <span className={product.stock_quantity < 5 ? 'text-danger fw-bold' : ''}>
                                                                        {product.stock_quantity} шт.
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <Button
                                                                        variant="warning"
                                                                        size="sm"
                                                                        className="me-2"
                                                                        onClick={() => {
                                                                            setSelectedProduct(product.id)
                                                                            setUpdateShow(true)
                                                                        }}
                                                                    >
                                                                        Редактировать
                                                                    </Button>
                                                                    <Button
                                                                        variant="danger"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(product.id, product.name)}
                                                                        disabled={loading} 
                                                                    >
                                                                        {loading ? 'Удаление...' : 'Удалить'}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            )}
                                        </Tab.Pane>
                                        {/* Вкладка заказов */}
                                        <Tab.Pane eventKey="orders">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h4>Управление заказами ({orders.length})</h4>
                                            </div>
                                            <Orders items={orders} admin={true} onUpdate={loadData} />
                                        </Tab.Pane>
                                        <Tab.Pane eventKey="filters">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h4>Управление фильтрами</h4>
                                            </div>
                                            <FilterManager />
                                        </Tab.Pane>
                                            <Tab.Pane eventKey="discounts">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h4> Управление скидками и статусами</h4>
                                                </div>
                                                <DiscountManager />
                                            </Tab.Pane>
                                    </Tab.Content>
                                </Card.Body>
                            </Card>
                        </Tab.Container>
                    </Col>
                </Row>

                {/* Модальные окна */}
                <CreateProduct 
                    show={createShow} 
                    setShow={setCreateShow}
                    setChange={setChange}
                />
                
                <UpdateProduct 
                    id={selectedProduct}
                    show={updateShow}
                    setShow={setUpdateShow}
                    setChange={setChange}
                />

                <CreateCategory
                    show={categoryShow}
                    setShow={setCategoryShow}
                    setChange={setChange}
                />

                <CreateBrand
                    show={brandShow}
                    setShow={setBrandShow}
                    setChange={setChange}
                />
            </Container>
        </ProtectedRoute>
    )
})

export default Admin