import { observer } from 'mobx-react-lite'
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap'
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/ContextProvider'
import { addToBasket } from '../http/catalogAPI'

const Favorites = observer(() => {
    const { user, basket, favorites } = useContext(AppContext)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadFavorites = async () => {
            if (!user.isAuth) return
            
            try {
                setLoading(true)
                await favorites.loadFavorites()
            } catch (err) {
                setError('Ошибка загрузки избранного: ' + err.message)
            } finally {
                setLoading(false)
            }
        }

        loadFavorites()
    }, [user.isAuth, favorites])

    const handleRemoveFromFavorites = async (productId, e) => {
        e.stopPropagation()
        try {
            await favorites.removeFromFavorites(productId)
        } catch (error) {
            alert('Ошибка удаления из избранного: ' + error.message)
        }
    }

    const handleAddToBasket = async (productId, e) => {
        e.stopPropagation()
        if (!user.isAuth) {
            alert('Для добавления в корзину необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            await addToBasket(productId, 1)
            await basket.loadBasket()
            alert('Товар добавлен в корзину!')
        } catch (error) {
            alert('Ошибка добавления в корзину: ' + error.message)
        }
    }

    if (!user.isAuth) {
        return (
            <Container className="mt-4">
                <Alert variant="warning">
                    Для просмотра избранного необходимо авторизоваться.
                </Alert>
            </Container>
        )
    }

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" />
                <div className="mt-3">Загрузка избранного...</div>
            </Container>
        )
    }

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Избранное</h2>
                {favorites.favorites.length > 0 && (
                    <Badge bg="primary" className="fs-6">
                        {favorites.favorites.length} товаров
                    </Badge>
                )}
            </div>

            {error && (
                <Alert variant="danger">{error}</Alert>
            )}

            {favorites.favorites.length === 0 ? (
                <Alert variant="info">
                    <Alert.Heading>В избранном пока нет товаров</Alert.Heading>
                    <p>
                        Добавляйте товары, которые вам понравились, чтобы не потерять их!
                        Перейдите в <Alert.Link onClick={() => navigate('/shop')}>каталог</Alert.Link>, 
                        чтобы найти интересующие товары.
                    </p>
                </Alert>
            ) : (
                <Row>
                    {favorites.favorites.map(item => (
                        <Col key={item.id} lg={4} md={6} className="mb-4">
                            <Card 
                                className="h-100 product-card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/product/${item.product_id || item.id}`)}
                            >
                                <Card.Img 
                                    variant="top" 
                                    src={item.images && item.images.length > 0 ? 
                                        `http://localhost:3000${item.images[0]}` : 
                                        '/static/placeholder.jpg'
                                    }
                                    style={{ height: '200px', objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.target.src = '/static/placeholder.jpg'
                                    }}
                                />
                                <Card.Body className="d-flex flex-column">
                                    <Card.Title>{item.name}</Card.Title>
                                    
                                    <Card.Text className="text-muted small mb-2">
                                        {item.brand_name && `Бренд: ${item.brand_name}`}
                                    </Card.Text>
                                    
                                    <Card.Text className="flex-grow-1">
                                        {item.description && item.description.length > 100 
                                            ? `${item.description.substring(0, 100)}...` 
                                            : item.description
                                        }
                                    </Card.Text>
                                    
                                    <div className="mt-auto">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="h5 mb-0 text-primary">
                                                {item.finalPrice || item.price} ₽
                                            </span>
                                            {item.discount_percent > 0 && (
                                                <span className="text-muted text-decoration-line-through">
                                                    {item.price} ₽
                                                </span>
                                            )}
                                        </div>
                                        
                                        {item.discount_percent > 0 && (
                                            <div className="mb-2">
                                                <span className="badge bg-success">
                                                    -{item.discount_percent}%
                                                </span>
                                            </div>
                                        )}
                                        
                                        <div className="d-grid gap-2">
                                            <Button 
                                                variant="primary"
                                                onClick={(e) => handleAddToBasket(item.product_id || item.id, e)}
                                            >
                                                В корзину
                                            </Button>
                                            <Button 
                                                variant="outline-danger"
                                                onClick={(e) => handleRemoveFromFavorites(item.product_id || item.id, e)}
                                            >
                                                Удалить из избранного
                                            </Button>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    )
})

export default Favorites