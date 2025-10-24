import React, { useState, useContext } from 'react';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/ContextProvider';
import { authAPI } from '../http/authAPI';

const ResendVerification = () => {
    const { user } = useContext(AppContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResendEmail = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await authAPI.resendVerification();
            setMessage('Письмо с подтверждением отправлено на ваш email. Проверьте почту.');
        } catch (error) {
            setError('Ошибка при отправке письма: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user.isAuth) {
        return (
            <Container className="d-flex align-items-center justify-content-center min-vh-100">
                <Card style={{ maxWidth: '500px' }} className="text-center">
                    <Card.Body>
                        <h4>Требуется авторизация</h4>
                        <p>Пожалуйста, войдите в систему для доступа к этой странице.</p>
                        <Button onClick={() => navigate('/login')}>
                            Войти
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    if (user.emailVerified) {
        return (
            <Container className="d-flex align-items-center justify-content-center min-vh-100">
                <Card style={{ maxWidth: '500px' }} className="text-center">
                    <Card.Body>
                        <h4>Email уже подтвержден</h4>
                        <p>Ваш email адрес уже подтвержден.</p>
                        <Button onClick={() => navigate('/shop')}>
                            Перейти в магазин
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="d-flex align-items-center justify-content-center min-vh-100">
            <Card style={{ maxWidth: '500px', width: '100%' }} className="shadow-lg border-0">
                <Card.Body className="text-center p-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>
                        📧
                    </div>

                    <h3 className="mb-3 fw-bold">Подтверждение Email</h3>

                    <p className="text-muted mb-4">
                        Для завершения регистрации необходимо подтвердить ваш email адрес.
                        Проверьте вашу почту и перейдите по ссылке в письме.
                    </p>

                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="d-grid gap-3">
                        <Button 
                            variant="primary" 
                            size="lg"
                            onClick={handleResendEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Отправка...
                                </>
                            ) : (
                                'Отправить письмо повторно'
                            )}
                        </Button>
                        
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => navigate('/shop')}
                        >
                            Перейти в магазин
                        </Button>
                    </div>

                    <div className="mt-4 small text-muted">
                        <p>Не пришло письмо?</p>
                        <ul className="text-start">
                            <li>Проверьте папку "Спам"</li>
                            <li>Убедитесь, что ввели правильный email</li>
                            <li>Подождите несколько минут</li>
                        </ul>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ResendVerification;