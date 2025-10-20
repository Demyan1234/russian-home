import { useContext, useEffect, useState, useRef } from 'react'
import { Navbar, Nav, Container, Button, Badge } from 'react-bootstrap'
import { observer } from 'mobx-react-lite'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { SHOP_ROUTE, LOGIN_ROUTE, ADMIN_ROUTE, BASKET_ROUTE } from '../utils/consts'
import { fetchCategories } from '../http/catalogAPI'
import { AppContext } from '../context/ContextProvider'

const NavBar = observer(() => {
    const { user, basket, favorites } = useContext(AppContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [categories, setCategories] = useState([])
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await fetchCategories()
                setCategories(data || [])
            } catch (error) {
                console.error('Ошибка загрузки категорий:', error)
            }
        }
        loadCategories()
    }, [])

    const basketCount = basket?.count || 0
    const isAuth = user?.isAuth === true
    const isAdmin = user?.isAdmin === true
    const userName = user?.user?.name || user?.user?.email || 'Пользователь'
    const favoritesCount = favorites?.favoritesCount || 0

    const logOut = () => {
        if (user && typeof user.logout === 'function') {
            user.logout()
        }
        navigate(SHOP_ROUTE)
    }

    const handleCategorySelect = (categoryId) => {
        console.log(' Выбрана категория:', categoryId);
        navigate(`/shop?category=${categoryId}`);
        setShowDropdown(false);
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <Navbar bg="dark" variant="dark" expand="lg">
            <Container>
                <Navbar.Brand 
                    style={{cursor: 'pointer'}} 
                    onClick={() => navigate('/')}
                    className="fw-bold"
                >
                    Russian Home
                </Navbar.Brand>
                
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link 
                            onClick={() => navigate('/')}
                            active={location.pathname === '/'}
                        >
                            Главная
                        </Nav.Link>
                        
                        <div 
                            ref={dropdownRef}
                            className="nav-item dropdown"
                            onMouseEnter={() => setShowDropdown(true)}
                            onMouseLeave={() => setShowDropdown(false)}
                            style={{ position: 'relative' }}
                        >
                            <Nav.Link 
                                className="dropdown-toggle"
                                style={{ cursor: 'pointer' }}
                            >
                                Каталог
                            </Nav.Link>
                            
                            {showDropdown && (
                                <div 
                                    className="dropdown-menu show"
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        zIndex: 1000,
                                        minWidth: '200px',
                                        backgroundColor: '#343a40',
                                        border: '1px solid #495057',
                                        borderRadius: '0.375rem'
                                    }}
                                >
                                    <button 
                                        className="dropdown-item text-light"
                                        style={{ backgroundColor: 'transparent', border: 'none' }}
                                        onClick={() => {
                                            navigate('/shop')
                                            setShowDropdown(false)
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#495057'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        Все товары
                                    </button>
                                    <div className="dropdown-divider"></div>
                                    {categories.map(category => (
                                        <button 
                                            key={category.id}
                                            className="dropdown-item text-light"
                                            style={{ backgroundColor: 'transparent', border: 'none' }}
                                            onClick={() => handleCategorySelect(category.id)}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#495057'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {isAuth && (
                            <Nav.Link 
                                onClick={() => navigate('/user/orders')}
                                active={location.pathname === '/user/orders'}
                            >
                                Мои заказы
                            </Nav.Link>
                        )}
                        
                        {isAuth && (
                            <Nav.Link 
                                as={Link} 
                                to="/favorites" 
                                className="d-flex align-items-center position-relative"
                                active={location.pathname === '/favorites'}
                            >
                                Избранное
                                {favoritesCount > 0 && (
                                    <Badge 
                                        bg="danger" 
                                        className="position-absolute top-0 start-100 translate-middle"
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                    </Badge>
                                )}
                            </Nav.Link>
                        )}
                    </Nav>
                    
                    <Nav className="ms-auto">
                        {isAuth ? (
                            <>
                                <Button 
                                    variant="outline-light" 
                                    className="me-2 position-relative"
                                    onClick={() => navigate(BASKET_ROUTE)}
                                >
                                    Корзина 
                                    {basketCount > 0 && (
                                        <Badge 
                                            bg="danger" 
                                            className="position-absolute top-0 start-100 translate-middle"
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            {basketCount}
                                        </Badge>
                                    )}
                                </Button>
                                
                                {isAdmin && (
                                    <Button 
                                        variant="outline-warning" 
                                        className="me-2"
                                        onClick={() => navigate(ADMIN_ROUTE)}
                                    >
                                        Панель управления
                                    </Button>
                                )}
                                
                                <Button variant="outline-light" onClick={logOut}>
                                    Выйти ({userName})
                                </Button>
                            </>
                        ) : (
                            <Button 
                                variant="outline-light"
                                onClick={() => navigate(LOGIN_ROUTE)}
                            >
                                Войти
                            </Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
})

export default NavBar