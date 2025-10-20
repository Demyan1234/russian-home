import { observer } from 'mobx-react-lite'
import { useContext } from 'react'
import { AppContext } from '../context/ContextProvider'
import { Card, Row, Col } from 'react-bootstrap'

const BrandBar = observer(() => {
    const { catalog } = useContext(AppContext)

    const handleClick = (id) => {
        catalog.brand = id
    }

    return (
        <Row className="d-flex mb-3">
            <Col>
                <Card
                    border={!catalog.brand ? "primary" : "light"}
                    style={{cursor: 'pointer'}}
                    className="p-3 text-center"
                    onClick={() => handleClick(null)}
                >
                    Все бренды
                </Card>
            </Col>
            {catalog.brands.map(item =>
                <Col key={item.id}>
                    <Card
                        border={item.id === catalog.brand ? "primary" : "light"}
                        style={{cursor: 'pointer'}}
                        className="p-3 text-center"
                        onClick={() => handleClick(item.id)}
                    >
                        {item.name}
                    </Card>
                </Col>
            )}
        </Row>
    )
})

export default BrandBar