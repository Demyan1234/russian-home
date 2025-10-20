import { observer } from 'mobx-react-lite'
import { useContext, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'
import { getImageUrl } from '../utils/imageHelper'

const Favorites = observer(() => {
    const { user, favorites } = useContext(AppContext)

    useEffect(() => {
        if (user.isAuth) {
            favorites.loadFavorites()
        }
    }, [user.isAuth])

    const handleRemoveFavorite = async (productId) => {
        try {
            await favorites.removeFromFavorites(productId)
        } catch (error) {
            alert('Ошибка удаления из избранного: ' + error.message)
        }
    }

    if (!user.isAuth) {
        return (
            <Container className="mt-4">
                <Alert variant="warning">
                    Для просмотра избранного необходимо авторизоваться
                </Alert>
            </Container>
        )
    }

    return (
        <Container className="mt-4">
            <h2> Избранное</h2>
            
            {favorites.loading ? (
                <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Загрузка...</span>
                    </div>
                </div>
            ) : favorites.favorites.length === 0 ? (
                <Alert variant="info">
                    В избранном пока нет товаров
                </Alert>
            ) : (
                <Row>
                    {favorites.favorites.map(item => (
                        <Col md={4} key={item.id} className="mb-4">
                            <Card>
                                <Card.Img 
                                    variant="top" 
                                    src={getImageUrl(item.images?.[0])}
                                    style={{ height: '200px', objectFit: 'cover' }}
                                />
                                <Card.Body>
                                    <Card.Title>{item.name}</Card.Title>
                                    <Card.Text>
                                        {item.finalPrice || item.price} руб.
                                    </Card.Text>
                                    <Button 
                                        variant="danger" 
                                        size="sm"
                                        onClick={() => handleRemoveFavorite(item.product_id)}
                                    >
                                        Удалить из избранного
                                    </Button>
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