import { useEffect, useState } from 'react';
import { Container, Card, Alert, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OrderSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        const orderIdFromUrl = searchParams.get('orderId');
        if (orderIdFromUrl) {
            setOrderId(orderIdFromUrl);
        }
    }, [searchParams]);

    return (
        <Container className="py-5">
            <Card className="text-center">
                <Card.Body className="py-5">
                    <div className="mb-4">
                        <div style={{ fontSize: '4rem', color: '#28a745' }}>✓</div>
                    </div>
                    
                    <h1 className="text-success mb-3">Заказ успешно оплачен!</h1>
                    
                    {orderId && (
                        <Alert variant="success" className="mb-4">
                            <h4>Номер вашего заказа: #{orderId}</h4>
                            <p className="mb-0">
                                Мы отправили подтверждение на вашу почту
                            </p>
                        </Alert>
                    )}
                    
                    <p className="text-muted mb-4">
                        Спасибо за ваш заказ! Мы уже начали его обработку.<br />
                        В ближайшее время с вами свяжется наш менеджер для уточнения деталей доставки.
                    </p>
                    
                    <div className="d-flex justify-content-center gap-3">
                        <Button 
                            variant="primary" 
                            size="lg"
                            onClick={() => navigate('/shop')}
                        >
                            Продолжить покупки
                        </Button>
                        <Button 
                            variant="outline-primary" 
                            size="lg"
                            onClick={() => navigate('/user/orders')}
                        >
                            Мои заказы
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default OrderSuccess;