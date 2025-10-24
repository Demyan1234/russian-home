import { useContext, useEffect, useState, useRef } from 'react'
import { Navbar, Nav, Container, Button, Badge, Dropdown } from 'react-bootstrap'
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
    const userRole = user?.user?.role
    const isAdmin = userRole === 'admin'
    const isManager = userRole === 'manager'
    const userName = user?.user?.name || user?.user?.email || 'Пользователь'
    const favoritesCount = favorites?.favoritesCount || 0

    console.log('NavBar User State:', {
        isAuth,
        userRole,
        isAdmin,
        isManager,
        userName
    })

    const logOut = () => {
        if (user && typeof user.logout === 'function') {
            user.logout()
        }
        navigate(SHOP_ROUTE)
    }

    const handleCategorySelect = (categoryId) => {
        navigate(`/shop?category=${categoryId}`)
        setShowDropdown(false)
    }

    const navigateToAdmin = () => {
        navigate('/admin')
    }

    const navigateToManager = () => {
        navigate('/manager')
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
        <Navbar bg="dark" variant="dark" expand="lg" className="py-1">
            <Container>
                {/* Логотип */}
                <Navbar.Brand 
                    className="fw-bold"
                    style={{cursor: 'pointer', fontSize: '1.2rem'}} 
                    onClick={() => navigate('/')}
                >
                    Russian Home
                </Navbar.Brand>
                
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    {/* Основная навигация */}
                    <Nav className="me-auto">
                        <Nav.Link 
                            onClick={() => navigate('/')}
                            className={location.pathname === '/' ? 'active' : ''}
                        >
                            Главная
                        </Nav.Link>
                        
                        {/* Выпадающий каталог */}
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
                                        border: '1px solid #495057'
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
                        
                        {/* Мои заказы */}
                        {isAuth && (
                            <Nav.Link 
                                onClick={() => navigate('/orders')}
                                className={location.pathname === '/orders' ? 'active' : ''}
                            >
                                Мои заказы
                            </Nav.Link>
                        )}
                    </Nav>
                    
                    <Nav className="ms-auto d-flex align-items-center">
                        {/* Избранное */}
                        {isAuth && (
                            <Nav.Link 
                                onClick={() => navigate('/favorites')}
                                className={`me-2 ${location.pathname === '/favorites' ? 'active' : ''}`}
                            >
                                Избранное
                                {favoritesCount > 0 && (
                                    <Badge bg="danger" className="ms-1" style={{ fontSize: '0.7rem' }}>
                                        {favoritesCount}
                                    </Badge>
                                )}
                            </Nav.Link>
                        )}

                        {/* Корзина */}
                        {isAuth && (
                            <Button 
                                variant="outline-light" 
                                size="sm"
                                className="me-2 position-relative"
                                onClick={() => navigate(BASKET_ROUTE)}
                            >
                                Корзина
                                {basketCount > 0 && (
                                    <Badge 
                                        bg="danger" 
                                        className="position-absolute top-0 start-100 translate-middle"
                                        style={{ fontSize: '0.6rem' }}
                                    >
                                        {basketCount}
                                    </Badge>
                                )}
                            </Button>
                        )}

                        {/* Панель менеджера  */}
                        {isManager && !isAdmin && (
                            <Button 
                                variant="outline-info" 
                                size="sm"
                                className="me-2"
                                onClick={navigateToManager}
                            >
                                Панель менеджера
                            </Button>
                        )}

                        {/* Панель админа  */}
                        {isAdmin && (
                            <Button 
                                variant="outline-warning" 
                                size="sm"
                                className="me-2"
                                onClick={navigateToAdmin}
                            >
                                Панель админа
                            </Button>
                        )}

                        {/* Кнопка входа/выхода */}
                        {isAuth ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle 
                                    variant="outline-light" 
                                    size="sm"
                                    id="user-dropdown"
                                >
                                    {userName}
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="dropdown-menu-dark">
                                    <Dropdown.ItemText className="text-muted small">
                                        Роль: {isAdmin ? 'Администратор' : isManager ? 'Менеджер' : 'Пользователь'}
                                    </Dropdown.ItemText>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => navigate('/orders')}>
                                        Мои заказы
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => navigate('/favorites')}>
                                        Избранное
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={logOut} className="text-danger">
                                        Выйти
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <Button 
                                variant="outline-light"
                                size="sm"
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