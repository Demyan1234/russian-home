import { Table, Button, Badge, Card } from 'react-bootstrap'
import { deleteCategory } from '../../http/catalogAPI'
import { getImageUrl } from '../../utils/imageHelper' 

    const CategoriesList = ({ categories, loading, onUpdate }) => {
        const handleDelete = async (id, name) => {
            if (window.confirm(`Удалить категорию "${name}"?`)) {
                try {
                    await deleteCategory(id)
                    onUpdate()
                    alert('Категория успешно удалена!')
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

        if (categories.length === 0) {
            return (
                <Card>
                    <Card.Body className="text-center text-muted">
                        <h5>Категории не найдены</h5>
                        <p>Добавьте первую категорию для организации товаров</p>
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
                        <th>Изображение</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(category => (
                        <tr key={category.id}>
                            <td>{category.id}</td>
                            <td>
                                <strong>{category.name}</strong>
                            </td>
                            <td>
                                {category.description || (
                                    <span className="text-muted">Нет описания</span>
                                )}
                            </td>
                            <td>
                                <Badge bg="primary">
                                    {category.products_count || 0} товаров
                                </Badge>
                            </td>
                            <td>
                                {category.image ? (
                                    <img 
                                        src={getImageUrl(category.image)} 
                                        alt={category.name}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                        onError={(e) => {
                                            e.target.style.display = 'none'
                                        }}
                                    />
                                ) : (
                                    <span className="text-muted">Нет изображения</span>
                                )}
                            </td>
                            <td>
                                <Button
                                    variant="warning"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => alert('Редактирование категории в разработке')}
                                >
                                    Редактировать
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(category.id, category.name)}
                                    disabled={category.products_count > 0}
                                >
                                    Удалить
                                </Button>
                                {category.products_count > 0 && (
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

    export default CategoriesList   