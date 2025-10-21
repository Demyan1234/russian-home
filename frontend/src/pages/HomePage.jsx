import { observer } from 'mobx-react-lite'
import { useContext, useEffect, useState, useRef } from 'react'
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap' 
import { AppContext } from '../context/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchHomepageData, addToBasket } from '../http/catalogAPI'
import { getImageUrl, handleImageError } from '../utils/imageHelper';

const HomePage = observer(() => {
    const { user, basket } = useContext(AppContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [homepageData, setHomepageData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const hasLoaded = useRef(false)

    const loadHomepageData = async () => {
        
        if (hasLoaded.current) {
            console.log(' HomePage: Данные уже загружены, пропускаем')
            setLoading(false)
            return
        }

        if (location.pathname !== '/') {
            console.log(' HomePage: Не главная страница, пропускаем загрузку')
            setLoading(false)
            return
        }

        hasLoaded.current = true
        
        try {
            setError('')
            setLoading(true)
            console.log(' HomePage: Загрузка данных для главной страницы...')
            
            const data = await fetchHomepageData()
            setHomepageData(data.data)
            console.log(' HomePage: Данные успешно загружены')
            
        } catch (error) {
            console.error(' HomePage: Ошибка загрузки:', error)
            setError('Не удалось загрузить данные. Проверьте подключение к серверу.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        console.log(' HomePage: useEffect вызван, путь:', location.pathname)
        loadHomepageData()
        
        return () => {
            console.log(' HomePage: Компонент размонтируется')
            hasLoaded.current = false
        }
    }, [location.pathname]) 

    const handleAddToBasket = async (product) => {
        if (!user.isAuth) {
            alert('Для добавления в корзину необходимо авторизоваться')
            navigate('/login')
            return
        }

        try {
            await addToBasket(product.id, 1)
            basket.loadBasket()
            alert(`Товар "${product.name}" добавлен в корзину!`)
        } catch (error) {
            alert('Ошибка добавления в корзину: ' + error.message)
        }
    }

    if (location.pathname !== '/') {
        console.log(' HomePage: Не главная страница, возвращаем null')
        return null
    }

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <div className="mt-3">Загрузка главной страницы...</div>
            </Container>
        )
    }

    if (error) {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    <Alert.Heading>Ошибка подключения</Alert.Heading>
                    <p>{error}</p>
                    <p>Убедитесь, что бэкенд сервер запущен на порту 3000</p>
                    <Button variant="primary" onClick={loadHomepageData}>
                        Попробовать снова
                    </Button>
                </Alert>
            </Container>
        )
    }

    console.log(' HomePage: Рендерим контент главной страницы')
    
    return (
        <Container className="py-4">
            <h1>Добро пожаловать в Russian Home</h1>
            <p>Качественная сантехника по лучшим ценам</p>
            
            {homepageData && (
                <>
                    {/* Акции */}
                    {homepageData.promotions && homepageData.promotions.length > 0 && (
                        <section className="mb-5">
                            <h2> Акции и скидки</h2>
                            <Row>
                                {homepageData.promotions.map(product => (
                                    <Col lg={3} md={6} key={product.id} className="mb-3">
                                        <Card className="h-100">
                                    <Card.Img 
                                        variant="top" 
                                        src={getImageUrl(product.images?.[0])}
                                        style={{ height: '200px', objectFit: 'cover' }}
                                        onError={handleImageError}
                                    />
                                            <Card.Body>
                                                <Card.Title>{product.name}</Card.Title>
                                                <Card.Text>{product.finalPrice} руб.</Card.Text>
                                                <Button 
                                                    variant="primary"
                                                    onClick={() => handleAddToBasket(product)}
                                                >
                                                    В корзину
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </section>
                    )}

                    {/* Категории */}
                    {homepageData.categories && homepageData.categories.length > 0 && (
                        <section className="mb-5">
                            <h2> Категории товаров</h2>
                            <Row>
                                {homepageData.categories.map(category => (
                                    <Col lg={4} md={6} key={category.id} className="mb-3">
                                        <Card>
                                            <Card.Body>
                                                <Card.Title>{category.name}</Card.Title>
                                                <Card.Text>{category.description}</Card.Text>
                                                <Button 
                                                    variant="outline-primary"
                                                    onClick={() => navigate(`/shop?category=${category.id}`)}
                                                >
                                                    Смотреть товары
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </section>
                    )}
                </>
            )}
        </Container>
    )
})

export default HomePage