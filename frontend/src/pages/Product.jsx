import { observer } from 'mobx-react-lite'
import { useContext, useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    Container, Row, Col, Card, Button, Alert, Spinner, Badge, 
    Form, Tabs, Tab, ListGroup, Modal, Image
} from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'
import { 
    fetchOneProduct, 
    addToBasket, 
    fetchProductReviews, 
    fetchProductRating,
    addProductReview
} from '../http/catalogAPI'
import Rating from '../components/Rating'

const Product = observer(() => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, basket, favorites } = useContext(AppContext)
    const [product, setProduct] = useState(null)
    const [reviews, setReviews] = useState([])
    const [rating, setRating] = useState(null)
    const [loading, setLoading] = useState(true)
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('description')
    const [quantity, setQuantity] = useState(1)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        comment: ''
    })
    
    const [mainImageIndex, setMainImageIndex] = useState(0)
    const [showImageModal, setShowImageModal] = useState(false)
    const modalImageRef = useRef(null)

    useEffect(() => {
        const loadProductData = async () => {
            try {
                setLoading(true)
                console.log(' Загрузка полных данных товара ID:', id)
                
                const productData = await fetchOneProduct(id)
                console.log(' Товар загружен:', productData)
                console.log(' Изображения товара:', productData.images)
                
                setProduct(productData)
                
                await loadReviews()
                await loadRating()
                
            } catch (error) {
                console.error(' Ошибка загрузки товара:', error)
                setError('Товар не найден или ошибка загрузки')
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            loadProductData()
        }
    }, [id])

    const loadReviews = async () => {
        try {
            setReviewsLoading(true)
            const reviewsData = await fetchProductReviews(id)
            setReviews(reviewsData.data || [])
        } catch (error) {
            console.error('Ошибка загрузки отзывов:', error)
        } finally {
            setReviewsLoading(false)
        }
    }

    const loadRating = async () => {
        try {
            const ratingData = await fetchProductRating(id)
            setRating(ratingData.data || { avgRating: 0, reviewCount: 0 })
        } catch (error) {
            console.error('Ошибка загрузки рейтинга:', error)
            setRating({ avgRating: 0, reviewCount: 0 })
        }
    }

    const handleNextImage = () => {
        if (!product?.images) return
        setMainImageIndex(prev => (prev + 1) % product.images.length)
    }

    const handlePrevImage = () => {
        if (!product?.images) return
        setMainImageIndex(prev => (prev - 1 + product.images.length) % product.images.length)
    }

    const handleImageClick = (e) => {
        if (!showImageModal) {
            setShowImageModal(true)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const width = rect.width
            
            if (clickX < width / 3) {
                handlePrevImage()
            } else if (clickX > (width * 2) / 3) {
                handleNextImage()
            } 
        }
    }

    const handleThumbnailClick = (index) => {
        setMainImageIndex(index)
    }

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '/static/placeholder.jpg'
        if (imagePath.startsWith('http')) return imagePath
        return `http://localhost:3000${imagePath}`
    }

    const handleAddToBasket = async () => {
        if (!user.isAuth) {
            alert('Для добавления в корзину необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            await addToBasket(product.id, quantity)
            await basket.loadBasket()
            alert(`Товар "${product.name}" добавлен в корзину!`)
        } catch (error) {
            alert('Ошибка добавления в корзину: ' + error.message)
        }
    }

    const handleToggleFavorite = async () => {
        if (!user.isAuth) {
            alert('Для добавления в избранное необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            if (favorites.isFavorite(product.id)) {
                await favorites.removeFromFavorites(product.id)
                alert('Товар удален из избранного')
            } else {
                await favorites.addToFavorites(product.id)
                alert('Товар добавлен в избранное')
            }
        } catch (error) {
            alert('Ошибка: ' + error.message)
        }
    }

    const handleSubmitReview = async () => {
        if (!user.isAuth) {
            alert('Для добавления отзыва необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            await addProductReview(id, reviewForm)
            setShowReviewModal(false)
            setReviewForm({ rating: 5, comment: '' })
            
            await loadReviews()
            await loadRating()
            
            alert('Отзыв успешно добавлен!')
        } catch (error) {
            alert('Ошибка добавления отзыва: ' + error.message)
        }
    }

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <div className="mt-3">Загрузка товара...</div>
            </Container>
        )
    }

    if (error || !product) {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    <Alert.Heading>Товар не найден</Alert.Heading>
                    <p>{error || 'Такого товара не существует'}</p>
                    <Button variant="primary" onClick={() => navigate('/shop')}>
                        Вернуться в магазин
                    </Button>
                </Alert>
            </Container>
        )
    }

    const currentImage = product.images?.[mainImageIndex]

    return (
        <Container className="py-4">
            <nav aria-label="breadcrumb" className="mb-4">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item">
                        <Button 
                            variant="link" 
                            className="p-0 text-decoration-none"
                            onClick={() => navigate('/shop')}
                        >
                            Магазин
                        </Button>
                    </li>
                    <li className="breadcrumb-item">
                        <Button 
                            variant="link" 
                            className="p-0 text-decoration-none"
                            onClick={() => navigate(`/shop?category=${product.category_id}`)}
                        >
                            {product.category_name}
                        </Button>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        {product.name}
                    </li>
                </ol>
            </nav>

            <Row>
                <Col lg={6} className="mb-4">
                    <Card className="border-0">
                        <Card.Body className="p-0">
                            <div 
                                className="main-image-container position-relative"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setShowImageModal(true)}
                            >
                                <Image
                                    src={getImageUrl(currentImage)}
                                    alt={`${product.name} - фото ${mainImageIndex + 1}`}
                                    fluid
                                    className="rounded"
                                    style={{ 
                                        width: '100%',
                                        maxHeight: '500px',
                                        objectFit: 'contain',
                                        backgroundColor: '#f8f9fa'
                                    }}
                                    onError={(e) => {
                                        console.error(' Ошибка загрузки изображения:', currentImage)
                                        e.target.src = '/static/placeholder.jpg'
                                    }}
                                />
                                
                                {/* Счетчик изображений */}
                                {product.images && product.images.length > 1 && (
                                    <div className="position-absolute top-0 end-0 m-2">
                                        <Badge bg="dark" className="fs-6">
                                            {mainImageIndex + 1} / {product.images.length}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Миниатюры */}
                            {product.images && product.images.length > 1 && (
                                <div className="thumbnails mt-3">
                                    <Row className="g-2">
                                        {product.images.map((image, index) => (
                                            <Col xs={4} sm={3} lg={2} key={index}>
                                                <Card 
                                                    className={`thumbnail ${index === mainImageIndex ? 'active' : ''}`}
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        border: index === mainImageIndex ? '3px solid #007bff' : '1px solid #dee2e6'
                                                    }}
                                                    onClick={() => handleThumbnailClick(index)}
                                                >
                                                    <Image
                                                        src={getImageUrl(image)}
                                                        alt={`${product.name} - миниатюра ${index + 1}`}
                                                        style={{ 
                                                            height: '80px',
                                                            objectFit: 'cover'
                                                        }}
                                                        className="rounded"
                                                        onError={(e) => {
                                                            e.target.src = '/static/placeholder.jpg'
                                                        }}
                                                    />
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* ИНФОРМАЦИЯ О ТОВАРЕ */}
                <Col lg={6}>
                    <Card className="h-100 border-0">
                        <Card.Body className="p-4">
                            <div className="mb-3">
                                {product.status === 'new' && (
                                    <Badge bg="success" className="me-2 fs-6"> Новинка</Badge>
                                )}
                                {product.status === 'hit' && (
                                    <Badge bg="danger" className="me-2 fs-6"> Хит</Badge>
                                )}
                                {product.status === 'sale' && (
                                    <Badge bg="warning" className="me-2 fs-6"> Распродажа</Badge>
                                )}
                                {product.stock_quantity === 0 && (
                                    <Badge bg="secondary" className="fs-6"> Нет в наличии</Badge>
                                )}
                            </div>

                            <Card.Title className="h2 mb-3">{product.name}</Card.Title>
                            
                            {/* Рейтинг */}
                            {rating && rating.avgRating > 0 && (
                                <div className="mb-3">
                                    <div className="d-flex align-items-center">
                                        <Rating value={Math.round(rating.avgRating)} readonly size={20} />
                                        <span className="ms-2 fs-5">
                                            <strong>{rating.avgRating.toFixed(1)}</strong>
                                            <span className="text-muted"> ({rating.reviewCount} отзывов)</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Категория и бренд */}
                            <div className="mb-4">
                                <small className="text-muted fs-6">
                                    {product.category_name && `Категория: ${product.category_name}`}
                                    {product.brand_name && ` • Бренд: ${product.brand_name}`}
                                </small>
                            </div>

                            {/* Цена */}
                            <div className="mb-4">
                                {product.discount_percent > 0 ? (
                                    <div className="d-flex align-items-center">
                                        <span className="h1 text-success me-3">
                                            {Math.round(product.price * (1 - product.discount_percent / 100))} ₽
                                        </span>
                                        <div>
                                            <span className="h4 text-muted text-decoration-line-through d-block">
                                                {product.price} ₽
                                            </span>
                                            <Badge bg="success" className="fs-6">
                                                -{product.discount_percent}%
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="h1">{product.price} ₽</span>
                                )}
                            </div>

                            {/* Наличие */}
                            <div className="mb-4">
                                {product.stock_quantity > 0 ? (
                                    <Badge bg="success" className="fs-6 p-2">
                                        В наличии: {product.stock_quantity} шт.
                                    </Badge>
                                ) : (
                                    <Badge bg="secondary" className="fs-6 p-2">
                                        Нет в наличии
                                    </Badge>
                                )}
                            </div>

                            {/* Количество и кнопки */}
                            <div className="mb-4">
                                <Row className="g-3 align-items-center">
                                    <Col xs="auto">
                                        <Form.Label className="mb-0">Количество:</Form.Label>
                                    </Col>
                                    <Col xs="auto">
                                        <div className="d-flex align-items-center">
                                            <Button 
                                                variant="outline-secondary"
                                                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                            >
                                                -
                                            </Button>
                                            <Form.Control
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                min="1"
                                                max={product.stock_quantity}
                                                style={{ 
                                                    width: '80px', 
                                                    textAlign: 'center',
                                                    margin: '0 10px'
                                                }}
                                            />
                                            <Button 
                                                variant="outline-secondary"
                                                onClick={() => setQuantity(prev => Math.min(product.stock_quantity, prev + 1))}
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            {/* Основные кнопки */}
                            <div className="d-grid gap-2 mb-4">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleAddToBasket}
                                    disabled={product.stock_quantity === 0}
                                >
                                    Добавить в корзину
                                </Button>
                                
                                {favorites && (
                                    <Button
                                        variant={favorites.isFavorite(product.id) ? "danger" : "outline-danger"}
                                        onClick={handleToggleFavorite}
                                    >
                                        {favorites.isFavorite(product.id) ? '❤️ В избранном' : '🤍 В избранное'}
                                    </Button>
                                )}
                            </div>

                            {/* Быстрые характеристики */}
                            <Card className="bg-light">
                                <Card.Body>
                                    <h6 className="mb-3">Основные характеристики:</h6>
                                    <Row>
                                        {product.material && (
                                            <Col sm={6}>
                                                <strong>Материал:</strong> {product.material}
                                            </Col>
                                        )}
                                        {product.color && (
                                            <Col sm={6}>
                                                <strong>Цвет:</strong> {product.color}
                                            </Col>
                                        )}
                                        <Col sm={6}>
                                            <strong>Артикул:</strong> #{product.id}
                                        </Col>
                                        <Col sm={6}>
                                            <strong>Статус:</strong> {getStatusText(product.status)}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Детальная информация */}
            <Row className="mt-5">
                <Col>
                    <Card>
                        <Card.Body>
                            <Tabs
                                activeKey={activeTab}
                                onSelect={setActiveTab}
                                className="mb-3"
                            >
                                <Tab eventKey="description" title=" Описание">
                                    <div className="p-3">
                                        <h5>Описание товара</h5>
                                        <p className="fs-6">
                                            {product.description || 'Описание товара отсутствует.'}
                                        </p>
                                    </div>
                                </Tab>

                                <Tab eventKey="specifications" title=" Характеристики">
                                    <div className="p-3">
                                        <h5>Технические характеристики</h5>
                                        <ListGroup variant="flush">
                                            <ListGroup.Item>
                                                <strong>Название:</strong> {product.name}
                                            </ListGroup.Item>
                                            {product.category_name && (
                                                <ListGroup.Item>
                                                    <strong>Категория:</strong> {product.category_name}
                                                </ListGroup.Item>
                                            )}
                                            {product.brand_name && (
                                                <ListGroup.Item>
                                                    <strong>Бренд:</strong> {product.brand_name}
                                                </ListGroup.Item>
                                            )}
                                            {product.material && (
                                                <ListGroup.Item>
                                                    <strong>Материал:</strong> {product.material}
                                                </ListGroup.Item>
                                            )}
                                            {product.color && (
                                                <ListGroup.Item>
                                                    <strong>Цвет:</strong> {product.color}
                                                </ListGroup.Item>
                                            )}
                                            <ListGroup.Item>
                                                <strong>Цена:</strong> {product.price} ₽
                                            </ListGroup.Item>
                                            {product.discount_percent > 0 && (
                                                <ListGroup.Item>
                                                    <strong>Скидка:</strong> {product.discount_percent}%
                                                </ListGroup.Item>
                                            )}
                                            <ListGroup.Item>
                                                <strong>Наличие:</strong> {product.stock_quantity} шт.
                                            </ListGroup.Item>
                                            <ListGroup.Item>
                                                <strong>Статус:</strong> {getStatusText(product.status)}
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </div>
                                </Tab>

                                <Tab eventKey="reviews" title=" Отзывы">
                                    <div className="p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <div>
                                                <h5 className="mb-1">Отзывы о товаре</h5>
                                                {rating && (
                                                    <div className="d-flex align-items-center">
                                                        <Rating value={Math.round(rating.avgRating)} readonly size={18} />
                                                        <span className="ms-2">
                                                            <strong>{rating.avgRating.toFixed(1)}</strong> 
                                                            <span className="text-muted"> на основе {rating.reviewCount} отзывов</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button 
                                                variant="outline-primary"
                                                onClick={() => setShowReviewModal(true)}
                                            >
                                                Написать отзыв
                                            </Button>
                                        </div>

                                        {reviewsLoading ? (
                                            <div className="text-center py-3">
                                                <Spinner animation="border" size="sm" />
                                            </div>
                                        ) : reviews.length > 0 ? (
                                            <div className="reviews-list">
                                                {reviews.map(review => (
                                                    <Card key={review.id} className="mb-3">
                                                        <Card.Body>
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div>
                                                                    <strong>{review.user_name || 'Аноним'}</strong>
                                                                    <div className="mt-1">
                                                                        <Rating value={review.rating} readonly size={16} />
                                                                    </div>
                                                                </div>
                                                                <small className="text-muted">
                                                                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                                                </small>
                                                            </div>
                                                            <p className="mb-0">{review.comment}</p>
                                                        </Card.Body>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <Alert variant="info">
                                                Пока нет отзывов. Будьте первым!
                                            </Alert>
                                        )}
                                    </div>
                                </Tab>
                            </Tabs>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА ИЗОБРАЖЕНИЙ */}
            <Modal 
                show={showImageModal} 
                onHide={() => {
                    setShowImageModal(false)
                    setZoomMode(false)
                }}
                size="xl"
                centered
                fullscreen="md-down"
            >
                <Modal.Header closeButton className="border-0 bg-dark bg-opacity-10">
                    <Modal.Title className="small text-dark">
                        {product.name} - {mainImageIndex + 1} / {product.images?.length || 0}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body 
                    className="p-0 position-relative bg-dark"
                    style={{ minHeight: '60vh' }}
                    onClick={handleImageClick}
                >
                    <div 
                        className="modal-image-container d-flex align-items-center justify-content-center w-100 h-100"
                        style={{ 
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                    >
                        {currentImage && (
                            <Image
                                ref={modalImageRef}
                                src={getImageUrl(currentImage)}
                                alt={`${product.name} - фото ${mainImageIndex + 1}`}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onError={(e) => {
                                    e.target.src = '/static/placeholder.jpg'
                                }}
                            />
                        )}

                        {/* ИНДИКАТОРЫ ОБЛАСТЕЙ ДЛЯ ЛИСТАНИЯ */}
                        {product.images && product.images.length > 1 && (
                            <>
                                <div 
                                    className="nav-area-modal nav-area-left"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '30%',
                                        cursor: 'w-resize',
                                        background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        paddingLeft: '20px',
                                        opacity: 0.7
                                    }}
                                >
                                    <span style={{ color: 'white', fontSize: '2rem' }}>‹</span>
                                </div>
                                <div 
                                    className="nav-area-modal nav-area-right"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '30%',
                                        cursor: 'e-resize',
                                        background: 'linear-gradient(270deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        paddingRight: '20px',
                                        opacity: 0.7
                                    }}
                                >
                                    <span style={{ color: 'white', fontSize: '2rem' }}>›</span>
                                </div>
                            </>
                        )}

                    </div>
                </Modal.Body>

                <Modal.Footer className="border-0 justify-content-between bg-dark bg-opacity-10">
                    <div className="d-flex gap-2">
                    </div>

                    {/* МИНИАТЮРЫ В МОДАЛЬНОМ ОКНЕ */}
                    {product.images && product.images.length > 1 && (
                        <div className="d-flex gap-2 flex-wrap justify-content-center">
                            {product.images.map((image, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail-modal ${index === mainImageIndex ? 'active' : ''}`}
                                    onClick={() => handleThumbnailClick(index)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Image
                                        src={getImageUrl(image)}
                                        alt={`${product.name} - миниатюра ${index + 1}`}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            objectFit: 'cover',
                                            border: index === mainImageIndex ? '3px solid #007bff' : '2px solid #6c757d',
                                            borderRadius: '4px'
                                        }}
                                        className="rounded"
                                        onError={(e) => {
                                            e.target.src = '/static/placeholder.jpg'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Модальное окно отзыва */}
            <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Написать отзыв</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Оценка</Form.Label>
                            <div>
                                <Rating 
                                    value={reviewForm.rating} 
                                    onChange={(newRating) => setReviewForm(prev => ({ ...prev, rating: newRating }))}
                                    size={24}
                                />
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Комментарий</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                placeholder="Поделитесь вашим мнением о товаре..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmitReview}
                        disabled={!reviewForm.comment.trim()}
                    >
                        Отправить отзыв
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
})

const getStatusText = (status) => {
    const statusMap = {
        'new': 'Новинка',
        'hit': 'Хит',
        'sale': 'Распродажа', 
        'out_of_stock': 'Нет в наличии',
        'default': 'Обычный'
    }
    return statusMap[status] || status
}

export default Product