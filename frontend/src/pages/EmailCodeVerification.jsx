import React, { useState, useEffect, useContext } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { authAPI } from '../http/authAPI';
import { AppContext } from '../context/ContextProvider'; 

const EmailCodeVerification = observer(() => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AppContext);
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        const userEmail = location.state?.email || '';
        setEmail(userEmail);
        
        if (!userEmail) {
            navigate('/registration');
            return;
        }

        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [location.state, navigate]);

    const handleCodeChange = (index, value) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newCode = [...code];
            newCode[index] = value;
            setCode(newCode);

            if (value && index < 5) {
                const nextInput = document.getElementById(`code-${index + 1}`);
                if (nextInput) nextInput.focus();
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`code-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const numbers = pastedData.replace(/\D/g, '').split('').slice(0, 6);
        
        const newCode = [...code];
        numbers.forEach((num, index) => {
            if (index < 6) newCode[index] = num;
        });
        setCode(newCode);
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
        setError('Введите все 6 цифр кода');
        return;
    }

    setLoading(true);
    setError('');

    try {
        console.log('Verifying code for email:', email);
        const response = await authAPI.verifyCode(email, verificationCode);
        
        console.log('Code verification response:', response);
        
        if (response.token && response.user) {
            setMessage('Email успешно подтвержден!');
            
            console.log('Token and user data received directly in response');
            
            if (user && user.login) {
                console.log('Calling user.login()...');
                user.login(response.user, response.token);
                console.log('User login called');
            } else {
                console.log('User store not available, using localStorage');
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            console.log('Redirecting to home page...');
            navigate('/', { replace: true });
            return;
            
        } else if (response.success) {
            setMessage('Email успешно подтвержден!');
            
            if (response.data?.token && response.data?.user) {
                console.log('Token and user data received in response.data');
                
                if (user && user.login) {
                    user.login(response.data.user, response.data.token);
                } else {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
                
                console.log('Redirecting to home page...');
                navigate('/', { replace: true });
                return;
            }
        } else {
            console.log('Unexpected response structure:', response);
            setError('Неожиданный формат ответа от сервера');
        }
    } catch (error) {
        console.error('Code verification error:', error);
        setError(error.message || 'Неверный код подтверждения');
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-0')?.focus();
    } finally {
        setLoading(false);
    }
};

    const handleResendCode = async () => {
        if (countdown > 0) return;

        setResendLoading(true);
        setError('');

        try {
            await authAPI.resendCode(email);
            setMessage('Новый код отправлен на вашу почту');
            setCountdown(60);
        } catch (error) {
            setError('Ошибка при отправке кода: ' + error.message);
        } finally {
            setResendLoading(false);
        }
    };

    const isCodeComplete = code.join('').length === 6;

    return (
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
            <Card style={{ width: '100%', maxWidth: '500px' }} className="shadow-lg border-0">
                <Card.Body className="p-5">
                    <div className="text-center mb-4">
                        <div style={{ fontSize: '3rem' }}>📧</div>
                        <h3 className="fw-bold mt-3">Подтверждение Email</h3>
                        <p className="text-muted">
                            Мы отправили 6-значный код на email:<br />
                            <strong>{email}</strong>
                        </p>
                    </div>

                    {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                    {message && <Alert variant="success" className="mb-3">{message}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="form-label fw-semibold">Код подтверждения</label>
                            <Row className="g-2 justify-content-center">
                                {code.map((digit, index) => (
                                    <Col key={index} xs={2} className="text-center">
                                        <Form.Control
                                            id={`code-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleCodeChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onPaste={handlePaste}
                                            className="text-center fw-bold fs-5"
                                            style={{ height: '60px' }}
                                            autoFocus={index === 0}
                                            disabled={loading}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        <Button
                            variant="primary"
                            type="submit"
                            size="lg"
                            className="w-100 mb-3"
                            disabled={!isCodeComplete || loading}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Проверка...
                                </>
                            ) : (
                                'Подтвердить Email'
                            )}
                        </Button>
                    </Form>

                    <div className="text-center">
                        <Button
                            variant="outline-secondary"
                            onClick={handleResendCode}
                            disabled={resendLoading || countdown > 0}
                            size="sm"
                        >
                            {resendLoading ? (
                                <Spinner animation="border" size="sm" className="me-2" />
                            ) : countdown > 0 ? (
                                `Отправить повторно (${countdown}с)`
                            ) : (
                                'Отправить код повторно'
                            )}
                        </Button>
                    </div>

                    <div className="mt-4 text-center text-muted small">
                        <p>Не пришел код?</p>
                        <ul className="list-unstyled">
                            <li>• Проверьте папку "Спам"</li>
                            <li>• Убедитесь в правильности email</li>
                            <li>• Подождите 1-2 минуты</li>
                        </ul>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
});

export default EmailCodeVerification;