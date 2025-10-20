import { Container, Row, Col, Nav } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const Footer = () => {
    return (
        <footer 
            className="mt-auto" 
            style={{ 
                backgroundColor: '#2c3e50', 
                color: '#ecf0f1',
                padding: '2rem 0',
                marginTop: 'auto' 
            }}
        >
            <Container>
                <Row>
                    <Col md={4}>
                        <h5 style={{ color: '#ffffff', fontWeight: 'bold' }}> Russian Home</h5>
                        <p style={{ color: '#bdc3c7', lineHeight: '1.6' }}>
                            Магазин качественной сантехники по доступным ценам. 
                            Широкий ассортимент товаров для вашего дома.
                        </p>
                    </Col>
                    
                    <Col md={4}>
                        <h5 style={{ color: '#ffffff', fontWeight: 'bold' }}> Быстрые ссылки</h5>
                        <Nav className="flex-column">
                            <Nav.Link 
                                as={Link} 
                                to="/" 
                                style={{ color: '#bdc3c7', padding: '0.25rem 0' }}
                            >
                                Главная
                            </Nav.Link>
                            <Nav.Link 
                                as={Link} 
                                to="/shop" 
                                style={{ color: '#bdc3c7', padding: '0.25rem 0' }}
                            >
                                Каталог
                            </Nav.Link>
                        </Nav>
                    </Col>
                    
                    <Col md={4}>
                        <h5 style={{ color: '#ffffff', fontWeight: 'bold' }}> Контакты</h5>
                        <div style={{ color: '#bdc3c7' }}>
                            <p style={{ marginBottom: '0.5rem' }}>
                                <strong> Email:</strong> info@russianhome.ru
                            </p>
                            <p style={{ marginBottom: '0.5rem' }}>
                                <strong> Телефон:</strong> +7 (999) 999-99-99
                            </p>
                        </div>
                    </Col>
                </Row>
                
                <hr style={{ 
                    borderColor: '#34495e', 
                    margin: '1.5rem 0' 
                }} />
                
                <Row>
                    <Col className="text-center">
                        <p style={{ 
                            color: '#95a5a6', 
                            marginBottom: '0',
                            fontSize: '0.9rem'
                        }}>
                            © 2024 Russian Home. Все права защищены.
                        </p>
                    </Col>
                </Row>
            </Container>
        </footer>
    )
}

export default Footer