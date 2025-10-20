import { observer } from 'mobx-react-lite'
import { useContext, useEffect } from 'react'
import { Container } from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'
import BasketList from '../components/BasketList'
import ProtectedRoute from '../components/Admin/ProtectedRoute'

const Basket = observer(() => {
    const { basket } = useContext(AppContext)

    useEffect(() => {
        basket.loadBasket()
    }, [])

    return (
        <ProtectedRoute>
            <Container>
                <h1 className="my-4">Корзина</h1>
                <BasketList />
            </Container>
        </ProtectedRoute>
    )
})

export default Basket