import { observer } from 'mobx-react-lite'
import { useState, useContext } from 'react'
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/ContextProvider'
import { LOGIN_ROUTE, REGISTRATION_ROUTE, SHOP_ROUTE } from '../utils/consts'
import { loginUser, registerUser } from '../http/catalogAPI'

const Auth = observer(() => {
    const { user } = useContext(AppContext)
    const location = useLocation()
    const navigate = useNavigate()
    const isLogin = location.pathname === LOGIN_ROUTE
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
        setError('')
    }

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        console.log(` ${isLogin ? 'Login' : 'Register'} attempt for:`, formData.email);
        
        let response;
        if (isLogin) {
            response = await loginUser(formData.email, formData.password);
        } else {
            response = await registerUser(formData);
        }

        console.log(' Auth response:', response);

        if (response.success) {
            if (response.data && response.data.token) {
                user.login(response.data.user, response.data.token);
                console.log(' Login successful with token');
                navigate(SHOP_ROUTE);
            } else if (response.data && response.data.user) {
                user.login(response.data.user, response.data.token);
                console.log(' Login successful');
                navigate(SHOP_ROUTE);
            } else if (response.message) {
                alert(response.message || 'Регистрация успешна! Теперь войдите в систему.');
                navigate(LOGIN_ROUTE);
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
        } else {
            throw new Error(response.error || 'Ошибка авторизации');
        }
    } catch (error) {
        console.error(' Auth error:', error);
        setError(error.message || 'Произошла ошибка при авторизации');
    } finally {
        setLoading(false);
    }
};

const handleSocialAuth = async (provider) => {
    try {
        const response = await fetch(`/api/auth/oauth/${provider}`)
        const data = await response.json()
        
        if (data.url) {
            window.location.href = data.url
        }
    } catch (error) {
        setError('Ошибка авторизации через социальную сеть')
    }
}

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{height: '80vh'}}>
            <Card style={{width: 600}} className="p-5 shadow">
                <h2 className="m-auto text-center mb-4">
                    {isLogin ? 'Авторизация' : 'Регистрация'}
                </h2>
                
                {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Имя</Form.Label>
                                <Form.Control
                                    name="name"
                                    placeholder="Введите ваше имя..."
                                    value={formData.name}
                                    onChange={handleChange}
                                    required={!isLogin}
                                />
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                                <Form.Label>Телефон</Form.Label>
                                <Form.Control
                                    name="phone"
                                    placeholder="Введите ваш телефон..."
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </>
                    )}
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            name="email"
                            type="email"
                            placeholder="Введите ваш email..."
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Пароль</Form.Label>
                        <Form.Control
                            name="password"
                            type="password"
                            placeholder="Введите ваш пароль..."
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    
                    <Row className="d-flex justify-content-between mt-4">
                        <Col>
                            {isLogin ? 
                                <div className="text-muted">
                                    Нет аккаунта?{' '}
                                    <span 
                                        style={{color: 'blue', cursor: 'pointer'}} 
                                        onClick={() => navigate(REGISTRATION_ROUTE)}
                                    >
                                        Зарегистрируйся!
                                    </span>
                                </div>
                                :
                                <div className="text-muted">
                                    Есть аккаунт?{' '}
                                    <span 
                                        style={{color: 'blue', cursor: 'pointer'}} 
                                        onClick={() => navigate(LOGIN_ROUTE)}
                                    >
                                        Войдите!
                                    </span>
                                </div>
                            }
                        </Col>
                        <Col className="d-flex justify-content-end">
                            <Button 
                                variant="primary" 
                                type="submit" 
                                disabled={loading}
                                size="lg"
                            >
                                {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Регистрация')}
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card>
        </Container>
    )
})

export default Auth