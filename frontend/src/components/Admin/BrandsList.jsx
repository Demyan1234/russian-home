import { Table, Button, Badge, Card } from 'react-bootstrap'

const BrandsList = ({ brands, loading, onUpdate }) => {
    const handleDelete = async (id, name) => {
        if (window.confirm(`Удалить бренд "${name}"?`)) {
            try {
                alert(`Бренд "${name}" будет удален (функционал в разработке)`)
            } catch (error) {
                alert('Ошибка удаления: ' + error.message)
            }
        }
    }

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
            </div>
        )
    }

    if (brands.length === 0) {
        return (
            <Card>
                <Card.Body className="text-center text-muted">
                    <h5>Бренды не найдены</h5>
                    <p>Добавьте первый бренд для организации товаров</p>
                </Card.Body>
            </Card>
        )
    }

    return (
        <Table bordered hover responsive>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Товаров</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                {brands.map(brand => (
                    <tr key={brand.id}>
                        <td>{brand.id}</td>
                        <td>
                            <strong>{brand.name}</strong>
                        </td>
                        <td>
                            {brand.description || (
                                <span className="text-muted">Нет описания</span>
                            )}
                        </td>
                        <td>
                            <Badge bg="info">
                                {brand.products_count || 0} товаров
                            </Badge>
                        </td>
                        <td>
                            <Button
                                variant="warning"
                                size="sm"
                                className="me-2"
                                onClick={() => alert('Редактирование бренда в разработке')}
                            >
                                Редактировать
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(brand.id, brand.name)}
                                disabled={brand.products_count > 0}
                            >
                                Удалить
                            </Button>
                            {brand.products_count > 0 && (
                                <div className="text-danger small mt-1">
                                    Нельзя удалить - есть товары
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default BrandsList