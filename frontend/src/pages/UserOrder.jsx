import { observer } from 'mobx-react-lite'
import { Container, Spinner, Button } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { userGetOne } from '../http/orderAPI'
import Order from '../components/Order'

const UserOrder = observer(() => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        userGetOne(id)
            .then(data => setOrder(data))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <Container className="d-flex justify-content-center mt-5">
                <Spinner animation="border" />
            </Container>
        )
    }

    return (
        <Container>
            <Button variant="secondary" className="mb-3" onClick={() => navigate(-1)}>
                ← Назад
            </Button>
            {order && <Order data={order} />}
        </Container>
    )
})

export default UserOrder