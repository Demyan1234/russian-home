import React, { useState } from 'react';
import { Card, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';

const ReviewModeration = ({ 
  reviews = [], 
  loading = false, 
  onApprove, 
  onReject, 
  stats = {} 
}) => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');
  
  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <div className="mt-2">Загрузка отзывов...</div>
      </div>
    );
  }

  return (
    <div>
      <h4>Модерация отзывов</h4>
      
      {/* Статистика */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5 className="text-primary">{stats.total_reviews || 0}</h5>
              <p className="text-muted mb-0">Всего отзывов</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning">
            <Card.Body>
              <h5 className="text-warning">{stats.pending_reviews || 0}</h5>
              <p className="text-muted mb-0">Ожидают модерации</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <h5 className="text-success">{stats.approved_reviews || 0}</h5>
              <p className="text-muted mb-0">Одобрено</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-danger">
            <Card.Body>
              <h5 className="text-danger">{stats.rejected_reviews || 0}</h5>
              <p className="text-muted mb-0">Отклонено</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Список отзывов */}
      <div>
        {reviews.length === 0 ? (
          <Alert variant="info">
            Нет отзывов для модерации
          </Alert>
        ) : (
          reviews.map(review => (
            <Card key={review.id} className="mb-3 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <h6 className="mb-0 me-3 text-primary">{review.product_name}</h6>
                      <Badge 
                        bg={
                          review.status === 'approved' ? 'success' :
                          review.status === 'rejected' ? 'danger' : 'warning'
                        }
                      >
                        {review.status === 'approved' ? 'Одобрен' :
                         review.status === 'rejected' ? 'Отклонен' : 'На модерации'}
                      </Badge>
                    </div>
                    
                    <div className="mb-2">
                      <strong>👤 Пользователь:</strong> {review.user_name} ({review.user_email})
                    </div>
                    
                    <div className="mb-2">
                      <strong>⭐ Рейтинг:</strong> 
                      <span className="text-warning ms-2">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span className="text-muted ms-2">({review.rating}/5)</span>
                    </div>
                    
                    {review.comment && (
                      <div className="mb-2">
                        <strong> Отзыв:</strong> 
                        <div className="border-start border-3 border-primary ps-3 mt-1 bg-light rounded p-2">
                          {review.comment}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-muted small">
                      <strong> Дата:</strong> {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      {review.moderated_at && (
                        <span className="ms-3">
                          <strong> Модерирован:</strong> {new Date(review.moderated_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>

                  {review.status === 'pending' && (
                    <div className="d-flex flex-column gap-2 ms-3">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => onApprove(review.id)}
                        className="px-3"
                      >
                        Одобрить
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Укажите причину отклонения отзыва:');
                          if (reason) onReject(review.id, reason);
                        }}
                        className="px-3"
                      >
                        Отклонить
                      </Button>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewModeration;