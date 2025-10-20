import { useState, useEffect } from 'react'
import { Card, Form, Button, Alert, ListGroup } from 'react-bootstrap'
import { observer } from 'mobx-react-lite'
import { useContext } from 'react'
import { AppContext } from '../context/ContextProvider'
import Rating from './Rating' 

const ProductReviews = observer(({ productId }) => {
    const { user } = useContext(AppContext)
    const [reviews, setReviews] = useState([])
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [ratingStats, setRatingStats] = useState(null)

    useEffect(() => {
        loadReviews()
        loadRatingStats()
    }, [productId])

    const loadReviews = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`)
            const data = await response.json()
            if (data.success) {
                setReviews(data.data)
            }
        } catch (error) {
            console.error('Load reviews error:', error)
        }
    }

    const loadRatingStats = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}/rating`)
            const data = await response.json()
            if (data.success) {
                setRatingStats(data.data)
            }
        } catch (error) {
            console.error('Load rating stats error:', error)
        }
    }

    const handleSubmitReview = async (e) => {
        e.preventDefault()
        if (!user.isAuth) {
            setError('Требуется авторизация для добавления отзыва')
            return
        }

        if (rating === 0) {
            setError('Пожалуйста, поставьте оценку')
            return
        }

        setLoading(true)
        setError('')

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3000/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comment })
            })

            const data = await response.json()

            if (data.success) {
                setRating(0)
                setComment('')
                loadReviews()
                loadRatingStats()
                alert('Отзыв добавлен успешно!')
            } else {
                setError(data.error)
            }
        } catch (error) {
            setError('Ошибка при добавлении отзыва')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-5">
            <h4>Отзывы и оценки</h4>
            
            {/* СТАТИСТИКА РЕЙТИНГА */}
            {ratingStats && (
                <Card className="mb-4">
                    <Card.Body>
                        <div className="d-flex align-items-center">
                            <div className="text-center me-4">
                                <h2 className="mb-0 text-primary">
                                    {ratingStats.avgRating.toFixed(1)}
                                </h2>
                                <Rating 
                                    value={Math.round(ratingStats.avgRating)} 
                                    readonly 
                                    size={20}
                                />
                                <div className="text-muted small">
                                    {ratingStats.reviewCount} отзывов
                                </div>
                            </div>
                            
                            <div className="flex-grow-1">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <div key={star} className="d-flex align-items-center mb-1">
                                        <span className="me-2">{star} ★</span>
                                        <div className="progress flex-grow-1" style={{height: '8px'}}>
                                            <div 
                                                className="progress-bar bg-warning" 
                                                style={{
                                                    width: `${ratingStats.reviewCount > 0 ? (ratingStats.distribution[star] / ratingStats.reviewCount) * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                        <span className="ms-2 text-muted small">
                                            {ratingStats.distribution[star]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* ФОРМА ДОБАВЛЕНИЯ ОТЗЫВА */}
            {user.isAuth ? (
                <Card className="mb-4">
                    <Card.Header>
                        <h5 className="mb-0">Оставить отзыв</h5>
                    </Card.Header>
                    <Card.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        
                        <Form onSubmit={handleSubmitReview}>
                            <Form.Group className="mb-3">
                                <Form.Label>Ваша оценка:</Form.Label>
                                <div>
                                    <Rating
                                        value={rating}
                                        onChange={setRating}
                                        size={30}
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Комментарий:</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Расскажите о вашем опыте использования товара..."
                                />
                            </Form.Group>

                            <Button 
                                type="submit" 
                                variant="primary"
                                disabled={loading}
                            >
                                {loading ? 'Отправка...' : 'Отправить отзыв'}
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            ) : (
                <Alert variant="info">
                    Войдите в систему, чтобы оставить отзыв
                </Alert>
            )}

            {/* СПИСОК ОТЗЫВОВ */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        Отзывы покупателей ({reviews.length})
                    </h5>
                </Card.Header>
                <Card.Body>
                    {reviews.length > 0 ? (
                        <ListGroup variant="flush">
                            {reviews.map(review => (
                                <ListGroup.Item key={review.id} className="px-0">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <strong>{review.user_name || 'Аноним'}</strong>
                                            <Rating 
                                                value={review.rating} 
                                                readonly 
                                                size={16}
                                                className="ms-2"
                                            />
                                        </div>
                                        <small className="text-muted">
                                            {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                        </small>
                                    </div>
                                    {review.comment && (
                                        <p className="mb-0">{review.comment}</p>
                                    )}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <p className="text-muted text-center">
                            Пока нет отзывов. Будьте первым!
                        </p>
                    )}
                </Card.Body>
            </Card>
        </div>
    )
})

export default ProductReviews