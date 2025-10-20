import { observer } from 'mobx-react-lite'
import { Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/ContextProvider'
import { addToBasket } from '../http/catalogAPI'
import Rating from './Rating'

const ProductList = observer(({ products }) => {
    const { basket, user, favorites } = useContext(AppContext)
    const navigate = useNavigate()
    const [productsWithRatings, setProductsWithRatings] = useState([])

    useEffect(() => {
        const loadRatings = async () => {
            const productsWithRatings = await Promise.all(
                products.map(async (product) => {
                    try {
                        const response = await fetch(`http://localhost:3000/api/products/${product.id}/rating`)
                        const data = await response.json()
                        return {
                            ...product,
                            rating: data.success ? data.data : null
                        }
                    } catch (error) {
                        console.error(`Error loading rating for product ${product.id}:`, error)
                        return {
                            ...product,
                            rating: null
                        }
                    }
                })
            )
            setProductsWithRatings(productsWithRatings)
        }

        if (products.length > 0) {
            loadRatings()
        }
    }, [products])

    console.log(' ProductList получил товары:', products)

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

    const handleToggleFavorite = async (productId, e) => {
        e.stopPropagation()
        
        if (!user.isAuth) {
            alert('Для добавления в избранное необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            if (favorites.isFavorite(productId)) {
                await favorites.removeFromFavorites(productId)
                alert('Товар удален из избранного')
            } else {
                await favorites.addToFavorites(productId)
                alert('Товар добавлен в избранное')
            }
        } catch (error) {
            alert('Ошибка: ' + error.message)
        }
    }

    if (!products || products.length === 0) {
        return (
            <div className="text-center py-5">
                <Alert variant="info">
                    <h4>Товары не найдены</h4>
                    <p>В этой категории пока нет товаров</p>
                </Alert>
            </div>
        )
    }

    return (
        <Row>
            {productsWithRatings.map(product => (
                <Col lg={4} md={6} key={product.id} className="mb-4">
                    <Card 
                        className="h-100 product-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/product/${product.id}`)}
                    >
                        <Card.Img 
                            variant="top" 
                            src={product.images && product.images.length > 0 ? 
                                `http://localhost:3000${product.images[0]}` : 
                                '/static/placeholder.jpg'
                            }
                            style={{ height: '200px', objectFit: 'cover' }}
                            onError={(e) => {
                                e.target.src = '/static/placeholder.jpg'
                            }}
                        />
                        <Card.Body className="d-flex flex-column">
                            <Card.Title>{product.name}</Card.Title>
                            
                            {product.rating && product.rating.avgRating > 0 && (
                                <div className="mb-2">
                                    <div className="d-flex align-items-center">
                                        <Rating 
                                            value={Math.round(product.rating.avgRating)} 
                                            readonly 
                                            size={16}
                                        />
                                        <span className="ms-2 text-muted small">
                                            {product.rating.avgRating.toFixed(1)} ({product.rating.reviewCount})
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            <Card.Text className="flex-grow-1">
                                {product.description && product.description.length > 100 
                                    ? `${product.description.substring(0, 100)}...` 
                                    : product.description
                                }
                            </Card.Text>
                            
                            <div className="mt-auto">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="h5 mb-0 text-primary">
                                        {product.finalPrice || product.price} ₽
                                    </span>
                                    {product.discount_percent > 0 && (
                                        <span className="text-muted text-decoration-line-through">
                                            {product.price} ₽
                                        </span>
                                    )}
                                </div>
                                
                                {product.discount_percent > 0 && (
                                    <div className="mb-2">
                                        <span className="badge bg-success">
                                            -{product.discount_percent}%
                                        </span>
                                    </div>
                                )}
                                
                                <div className="d-grid gap-2">
                                    <Button 
                                        variant="primary"
                                        onClick={(e) => handleAddToBasket(product.id, e)}
                                    >
                                        В корзину
                                    </Button>
                                    {favorites && (
                                        <Button 
                                            variant={favorites.isFavorite(product.id) ? "danger" : "outline-danger"}
                                            onClick={(e) => handleToggleFavorite(product.id, e)}
                                            size="sm"
                                        >
                                            {favorites.isFavorite(product.id) ? '❤️ В избранном' : '🤍 В избранное'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    )
})

export default ProductList