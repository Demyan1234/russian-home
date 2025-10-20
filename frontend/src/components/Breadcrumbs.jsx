import { Breadcrumb } from 'react-bootstrap'
import { useLocation, Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite'

const Breadcrumbs = observer(() => {
    const location = useLocation()
    const pathnames = location.pathname.split('/').filter(x => x)

    const breadcrumbNameMap = {
        '': 'Главная',
        'shop': 'Каталог',
        'basket': 'Корзина',
        'checkout': 'Оформление заказа',
        'login': 'Вход',
        'registration': 'Регистрация',
        'admin': 'Админ-панель',
        'user': 'Личный кабинет',
        'orders': 'Мои заказы',
        'product': 'Товар'
    }

    return (
        <Breadcrumb className="mt-3">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
                                Главная
            </Breadcrumb.Item>
            
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`
                const isLast = index === pathnames.length - 1
                
                const displayName = value === 'product' && pathnames[index + 1] 
                    ? `Товар #${pathnames[index + 1]}` 
                    : breadcrumbNameMap[value] || value

                return isLast ? (
                    <Breadcrumb.Item active key={to}>
                        {displayName}
                    </Breadcrumb.Item>
                ) : (
                    <Breadcrumb.Item 
                        linkAs={Link} 
                        linkProps={{ to }} 
                        key={to}
                    >
                        {displayName}
                    </Breadcrumb.Item>
                )
            })}
        </Breadcrumb>
    )
})

export default Breadcrumbs