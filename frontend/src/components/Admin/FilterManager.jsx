import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import { 
    Card, 
    Table, 
    Button, 
    Badge, 
    Alert, 
    Modal, 
    Form,
    Row, 
    Col 
} from 'react-bootstrap'
import { 
    fetchProducts, 
    fetchAllBrands, 
    deleteBrand,
    fetchFiltersStats,
    cleanupMaterials,
    cleanupColors,
    deleteMaterial,
    deleteColor,
    deleteCategory,
    fetchCategoriesStats
} from '../../http/catalogAPI'

const FilterManager = observer(() => {
    const [products, setProducts] = useState([])
    const [brands, setBrands] = useState([])
    const [categories, setCategories] = useState([])
    const [filtersStats, setFiltersStats] = useState({
        materials: [],
        colors: [],
        brands: []
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCleanupModal, setShowCleanupModal] = useState(false)
    const [showIndividualModal, setShowIndividualModal] = useState(false)
    const [cleanupResults, setCleanupResults] = useState(null)
    const [selectedFilter, setSelectedFilter] = useState(null)
    const [activeTab, setActiveTab] = useState('materials')
    const [selectedItems, setSelectedItems] = useState({
        materials: [],
        colors: [],
        brands: [],
        categories: []
    })

    const loadData = async () => {
        setLoading(true)
        try {
            const productsData = await fetchProducts({ limit: 1000 })
            setProducts(productsData.products || [])
            
            const brandsData = await fetchAllBrands()
            setBrands(brandsData.data || brandsData || [])
            
            const categoriesData = await fetchCategoriesStats()
            setCategories(categoriesData || [])
            
            const statsData = await fetchFiltersStats()
            setFiltersStats(statsData.data || statsData || {
                materials: [],
                colors: [],
                brands: []
            })
            
        } catch (error) {
            console.error('Load data error:', error)
            setError('Ошибка загрузки данных: ' + error.message)
            setFiltersStats({
                materials: [],
                colors: [],
                brands: []
            })
            setCategories([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const analyzeUnusedFilters = () => {
        const materialsData = filtersStats.materials || []
        const colorsData = filtersStats.colors || []
        const brandsData = filtersStats.brands || []
        const categoriesData = categories || []
        const usedMaterials = new Set(materialsData.map(m => m.material).filter(Boolean))
        const usedColors = new Set(colorsData.map(c => c.color).filter(Boolean))
        const usedBrands = new Set(brandsData.filter(b => b && b.product_count > 0).map(b => b.id))
        const brandsWithProducts = brandsData.filter(brand => brand && brand.product_count > 0)
        const unusedBrands = brandsData.filter(brand => brand && brand.product_count === 0)
        const categoriesWithProducts = categoriesData.filter(category => category && category.product_count > 0)
        const unusedCategories = categoriesData.filter(category => category && category.product_count === 0)

        const allMaterials = [
            'Керамика', 'Нержавеющая сталь', 'Чугун', 'Акрил', 
            'Стекло', 'Дерево', 'Пластик', 'Камень', 'Фаянс', 'Хром'
        ]
        
        const allColors = [
            'Белый', 'Хром', 'Черный', 'Серебристый', 'Золотой', 
            'Бронзовый', 'Серый', 'Бежевый', 'Коричневый', 'Прозрачный'
        ]

        const unusedMaterials = allMaterials.filter(m => !usedMaterials.has(m))
        const unusedColors = allColors.filter(c => !usedColors.has(c))

        return {
            usedMaterials: Array.from(usedMaterials),
            usedColors: Array.from(usedColors),
            brandsWithProducts: brandsWithProducts || [],
            unusedBrands: unusedBrands || [],
            categoriesWithProducts: categoriesWithProducts || [],
            unusedCategories: unusedCategories || [],
            unusedMaterials,
            unusedColors,
            materialsWithProducts: materialsData.filter(m => m && m.product_count > 0) || [],
            colorsWithProducts: colorsData.filter(c => c && c.product_count > 0) || [],
            totalMaterials: materialsData.length + unusedMaterials.length,
            totalColors: colorsData.length + unusedColors.length,
            totalBrands: brandsData.length,
            totalCategories: categoriesData.length
        }
    }

    const handleCleanup = () => {
        const analysis = analyzeUnusedFilters()
        setCleanupResults(analysis)
        setShowCleanupModal(true)
    }

const handleDeleteBrand = async (brandId, brandName) => {
    if (window.confirm(`Удалить бренд "${brandName}"?`)) {
        try {
            await deleteBrand(brandId)
            await loadData()
            alert(`Бренд "${brandName}" успешно удален`)
        } catch (error) {
            console.error('Delete brand error:', error)
            
            if (error.message.includes('есть активные товары')) {
                const forceDelete = window.confirm(
                    `Не удалось удалить бренд "${brandName}" обычным способом. \n\n` +
                    `Причина: ${error.message}\n\n` +
                    `Попробовать принудительное удаление? (товары будут отвязаны от бренда)`
                )
                
                if (forceDelete) {
                    try {
                        const result = await forceDeleteBrand(brandId)
                        await loadData()
                        alert(result.message || `Бренд "${brandName}" принудительно удален`)
                    } catch (forceError) {
                        alert('Ошибка принудительного удаления: ' + forceError.message)
                    }
                }
            } else {
                alert('Ошибка удаления бренда: ' + error.message)
            }
        }
    }
}

    const handleDeleteCategory = async (categoryId, categoryName) => {
        if (window.confirm(`Удалить категорию "${categoryName}"?`)) {
            try {
                await deleteCategory(categoryId)
                await loadData()
                alert(`Категория "${categoryName}" успешно удалена`)
            } catch (error) {
                alert('Ошибка удаления категории: ' + error.message)
            }
        }
    }

    const handleDeleteMaterial = async (material) => {
        if (window.confirm(`Удалить материал "${material}" из всех товаров?`)) {
            try {
                const result = await deleteMaterial(material)
                await loadData()
                alert(result.message || `Материал "${material}" успешно удален`)
            } catch (error) {
                alert('Ошибка удаления материала: ' + error.message)
            }
        }
    }

    const handleDeleteColor = async (color) => {
        if (window.confirm(`Удалить цвет "${color}" из всех товаров?`)) {
            try {
                const result = await deleteColor(color)
                await loadData()
                alert(result.message || `Цвет "${color}" успешно удален`)
            } catch (error) {
                alert('Ошибка удаления цвета: ' + error.message)
            }
        }
    }

    const handleSelectItem = (type, item, checked) => {
        setSelectedItems(prev => {
            const newSelection = { ...prev }
            if (checked) {
                newSelection[type] = [...newSelection[type], item]
            } else {
                newSelection[type] = newSelection[type].filter(i => i !== item)
            }
            return newSelection
        })
    }

    const handleMassCleanup = async () => {
        try {
            let totalCleaned = 0
            
            for (const brand of selectedItems.brands) {
                await deleteBrand(brand.id)
                totalCleaned++
            }
            
            for (const category of selectedItems.categories) {
                await deleteCategory(category.id)
                totalCleaned++
            }
            
            if (selectedItems.materials.length > 0) {
                const result = await cleanupMaterials(selectedItems.materials)
                totalCleaned += selectedItems.materials.length
            }
            
            if (selectedItems.colors.length > 0) {
                const result = await cleanupColors(selectedItems.colors)
                totalCleaned += selectedItems.colors.length
            }
            
            setSelectedItems({ materials: [], colors: [], brands: [], categories: [] })
            await loadData()
            alert(`Успешно удалено ${totalCleaned} элементов`)
            
        } catch (error) {
            alert('Ошибка массового удаления: ' + error.message)
        }
    }

    const analysis = analyzeUnusedFilters()

    if (loading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </div>
                <p className="mt-2">Загрузка данных фильтров...</p>
            </div>
        )
    }


    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                
                <div>
                    <Button 
                        variant="outline-danger" 
                        onClick={handleCleanup}
                        disabled={analysis.unusedMaterials.length === 0 && 
                                analysis.unusedColors.length === 0 && 
                                analysis.unusedBrands.length === 0 &&
                                analysis.unusedCategories.length === 0}
                    >
                        Автоочистка
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="danger" className="mb-3">
                    <Alert.Heading>Ошибка загрузки</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" size="sm" onClick={loadData}>
                        Попробовать снова
                    </Button>
                </Alert>
            )}

            <div className="mb-4">
                <Button
                    variant={activeTab === 'materials' ? 'primary' : 'outline-primary'}
                    className="me-2"
                    onClick={() => setActiveTab('materials')}
                >
                    Материалы ({analysis.totalMaterials || 0})
                </Button>
                <Button
                    variant={activeTab === 'colors' ? 'primary' : 'outline-primary'}
                    className="me-2"
                    onClick={() => setActiveTab('colors')}
                >
                    Цвета ({analysis.totalColors || 0})
                </Button>
                <Button
                    variant={activeTab === 'brands' ? 'primary' : 'outline-primary'}
                    className="me-2"
                    onClick={() => setActiveTab('brands')}
                >
                    Бренды ({analysis.totalBrands || 0})
                </Button>
                <Button
                    variant={activeTab === 'categories' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('categories')}
                >
                    Категории ({analysis.totalCategories || 0})
                </Button>
            </div>

            {activeTab === 'materials' && (
                <Row>
                    <Col md={12}>
                        <Card className="mb-4">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0"> Материалы</h5>
                                <Badge bg="info">
                                    Используется: {analysis.materialsWithProducts.length} / Всего: {analysis.totalMaterials}
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                {analysis.materialsWithProducts.length === 0 && analysis.unusedMaterials.length === 0 ? (
                                    <div className="text-center text-muted py-4">
                                        <p>Нет данных о материалах</p>
                                        <Button variant="outline-primary" onClick={loadData}>
                                            Обновить данные
                                        </Button>
                                    </div>
                                ) : (
                                    <Table striped bordered size="sm">
                                        <thead>
                                            <tr>
                                                <th width="50px">Выбор</th>
                                                <th>Материал</th>
                                                <th>Используется</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.materialsWithProducts.map(material => (
                                                <tr key={material.material}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            onChange={(e) => handleSelectItem('materials', material.material, e.target.checked)}
                                                            checked={selectedItems.materials.includes(material.material)}
                                                        />
                                                    </td>
                                                    <td>{material.material}</td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {material.product_count} товаров
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteMaterial(material.material)}
                                                            title="Удалить из всех товаров"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {activeTab === 'colors' && (
                <Row>
                    <Col md={12}>
                        <Card className="mb-4">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0"> Цвета</h5>
                                <Badge bg="info">
                                    Используется: {analysis.colorsWithProducts.length} / Всего: {analysis.totalColors}
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                {analysis.colorsWithProducts.length === 0 && analysis.unusedColors.length === 0 ? (
                                    <div className="text-center text-muted py-4">
                                        <p>Нет данных о цветах</p>
                                        <Button variant="outline-primary" onClick={loadData}>
                                            Обновить данные
                                        </Button>
                                    </div>
                                ) : (
                                    <Table striped bordered size="sm">
                                        <thead>
                                            <tr>
                                                <th width="50px">Выбор</th>
                                                <th>Цвет</th>
                                                <th>Используется</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.colorsWithProducts.map(color => (
                                                <tr key={color.color}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            onChange={(e) => handleSelectItem('colors', color.color, e.target.checked)}
                                                            checked={selectedItems.colors.includes(color.color)}
                                                        />
                                                    </td>
                                                    <td>{color.color}</td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {color.product_count} товаров
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteColor(color.color)}
                                                            title="Удалить из всех товаров"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {activeTab === 'brands' && (
                <Row>
                    <Col md={12}>
                        <Card className="mb-4">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0"> Бренды</h5>
                                <Badge bg="info">
                                    Используется: {analysis.brandsWithProducts.length} / Всего: {analysis.totalBrands}
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                {analysis.brandsWithProducts.length === 0 && analysis.unusedBrands.length === 0 ? (
                                    <div className="text-center text-muted py-4">
                                        <p>Нет данных о брендах</p>
                                        <Button variant="outline-primary" onClick={loadData}>
                                            Обновить данные
                                        </Button>
                                    </div>
                                ) : (
                                    <Table striped bordered size="sm">
                                        <thead>
                                            <tr>
                                                <th width="50px">Выбор</th>
                                                <th>Бренд</th>
                                                <th>Используется</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.brandsWithProducts.map(brand => (
                                                <tr key={brand.id}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            disabled
                                                            title="Нельзя удалить - есть товары"
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{brand.name}</strong>
                                                    </td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {brand.product_count} товаров
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            disabled
                                                            title="Нельзя удалить - есть товары"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {analysis.unusedBrands.map(brand => (
                                                <tr key={brand.id} className="table-warning">
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            onChange={(e) => handleSelectItem('brands', brand, e.target.checked)}
                                                            checked={selectedItems.brands.includes(brand)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{brand.name}</strong>
                                                    </td>
                                                    <td>
                                                        {brand.description || '-'}
                                                    </td>
                                                    <td>0</td>
                                                    <td>
                                                        <Badge bg="secondary">Не используется</Badge>
                                                    </td>
                                                    <td>
                                                <div className="d-flex gap-1">
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => handleDeleteBrand(brand.id, brand.name)}
                                                            >
                                                                Удалить
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {activeTab === 'categories' && (
                <Row>
                    <Col md={12}>
                        <Card className="mb-4">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0"> Категории</h5>
                                <Badge bg="info">
                                    Используется: {analysis.categoriesWithProducts.length} / Всего: {analysis.totalCategories}
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                {analysis.categoriesWithProducts.length === 0 && analysis.unusedCategories.length === 0 ? (
                                    <div className="text-center text-muted py-4">
                                        <p>Нет данных о категориях</p>
                                        <Button variant="outline-primary" onClick={loadData}>
                                            Обновить данные
                                        </Button>
                                    </div>
                                ) : (
                                    <Table striped bordered size="sm">
                                        <thead>
                                            <tr>
                                                <th width="50px">Выбор</th>
                                                <th>Категория</th>
                                                <th>Используется</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysis.categoriesWithProducts.map(category => (
                                                <tr key={category.id}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            disabled
                                                            title="Нельзя удалить - есть товары"
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{category.name}</strong>
                                                    </td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {category.product_count} товаров
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            disabled
                                                            title="Нельзя удалить - есть товары"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {analysis.unusedCategories.map(category => (
                                                <tr key={category.id} className="table-warning">
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            onChange={(e) => handleSelectItem('categories', category, e.target.checked)}
                                                            checked={selectedItems.categories.includes(category)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{category.name}</strong>
                                                    </td>
                                                    <td>
                                                        {category.description || '-'}
                                                    </td>
                                                    <td>0</td>
                                                    <td>
                                                        <Badge bg="secondary">Не используется</Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteCategory(category.id, category.name)}
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {(selectedItems.materials.length > 0 || selectedItems.colors.length > 0 || selectedItems.brands.length > 0 || selectedItems.categories.length > 0) && (
                <Card className="mb-4 border-warning">
                    <Card.Body className="text-center">
                        <h5>Выбрано для удаления:</h5>
                        <p>
                            Материалы: {selectedItems.materials.length} | 
                            Цвета: {selectedItems.colors.length} | 
                            Бренды: {selectedItems.brands.length} |
                            Категории: {selectedItems.categories.length}
                        </p>
                        <Button 
                            variant="warning" 
                            size="lg"
                            onClick={handleMassCleanup}
                        >
                            Удалить выбранное ({selectedItems.materials.length + selectedItems.colors.length + selectedItems.brands.length + selectedItems.categories.length})
                        </Button>
                    </Card.Body>
                </Card>
            )}

            <Modal show={showCleanupModal} onHide={() => setShowCleanupModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Автоочистка неиспользуемых фильтров</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cleanupResults && (
                        <div>
                            <Alert variant="info">
                                Будут автоматически удалены следующие неиспользуемые значения:
                            </Alert>
                            
                            {cleanupResults.unusedCategories.length > 0 && (
                                <div className="mb-3">
                                    <h6>Категории ({cleanupResults.unusedCategories.length}):</h6>
                                    <ul>
                                        {cleanupResults.unusedCategories.map(category => (
                                            <li key={category.id}>
                                                <strong>{category.name}</strong>
                                                {category.description && ` - ${category.description}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {cleanupResults.unusedBrands.length > 0 && (
                                <div className="mb-3">
                                    <h6>Бренды ({cleanupResults.unusedBrands.length}):</h6>
                                    <ul>
                                        {cleanupResults.unusedBrands.map(brand => (
                                            <li key={brand.id}>
                                                <strong>{brand.name}</strong>
                                                {brand.description && ` - ${brand.description}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {cleanupResults.unusedMaterials.length > 0 && (
                                <div className="mb-3">
                                    <h6>Материалы ({cleanupResults.unusedMaterials.length}):</h6>
                                    <ul>
                                        {cleanupResults.unusedMaterials.map(material => (
                                            <li key={material}>{material}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {cleanupResults.unusedColors.length > 0 && (
                                <div className="mb-3">
                                    <h6>Цвета ({cleanupResults.unusedColors.length}):</h6>
                                    <ul>
                                        {cleanupResults.unusedColors.map(color => (
                                            <li key={color}>{color}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(cleanupResults.unusedCategories.length === 0 && 
                            cleanupResults.unusedBrands.length === 0 && 
                            cleanupResults.unusedMaterials.length === 0 && 
                            cleanupResults.unusedColors.length === 0) && (
                                <Alert variant="success">
                                    Все фильтры используются. Нечего очищать.
                                </Alert>
                            )}

                            <Alert variant="warning">
                                Это действие обновит список доступных фильтров. 
                                Новые товары смогут использовать только активные материалы, цвета, бренды и категории.
                            </Alert>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowCleanupModal(false)}
                    >
                        Отмена
                    </Button>
                    <Button 
                        variant="danger"
                        onClick={async () => {
                            try {
                                let totalCleaned = 0
                                
                                for (const category of cleanupResults.unusedCategories) {
                                    await deleteCategory(category.id)
                                    totalCleaned++
                                }
                                
                                for (const brand of cleanupResults.unusedBrands) {
                                    await deleteBrand(brand.id)
                                    totalCleaned++
                                }
                                
                                if (cleanupResults.unusedMaterials.length > 0) {
                                    await cleanupMaterials(cleanupResults.unusedMaterials)
                                    totalCleaned += cleanupResults.unusedMaterials.length
                                }
                                if (cleanupResults.unusedColors.length > 0) {
                                    await cleanupColors(cleanupResults.unusedColors)
                                    totalCleaned += cleanupResults.unusedColors.length
                                }
                                
                                setShowCleanupModal(false)
                                await loadData()
                                alert(`Автоочистка завершена! Удалено ${totalCleaned} элементов`)
                            } catch (error) {
                                alert('Ошибка при автоочистке: ' + error.message)
                            }
                        }}
                        disabled={!cleanupResults || (
                            cleanupResults.unusedCategories.length === 0 &&
                            cleanupResults.unusedBrands.length === 0 &&
                            cleanupResults.unusedMaterials.length === 0 &&
                            cleanupResults.unusedColors.length === 0
                        )}
                    >
                        Выполнить автоочистку
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showIndividualModal} onHide={() => setShowIndividualModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Выборочное управление фильтрами и категориями</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        Выберите элементы для удаления или используйте автоочистку
                    </Alert>
                    
                    <div className="mb-3">
                        <h6>Доступные действия:</h6>
                        <ul>
                            <li> <strong>Выборочное удаление</strong> - отмечайте галочками нужные элементы</li>
                            <li> <strong>Автоочистка</strong> - автоматически удалит все неиспользуемые фильтры</li>
                            <li> <strong>Индивидуальное удаление</strong> - используйте кнопки "Удалить" в таблицах</li>
                        </ul>
                    </div>

                    <div className="text-center">
                        <Button 
                            variant="primary"
                            className="me-2 mb-2"
                            onClick={() => {
                                setShowIndividualModal(false)
                                setActiveTab('materials')
                            }}
                        >
                            Управление материалами
                        </Button>
                        <Button 
                            variant="success"
                            className="me-2 mb-2"
                            onClick={() => {
                                setShowIndividualModal(false)
                                setActiveTab('colors')
                            }}
                        >
                            Управление цветами
                        </Button>
                        <Button 
                            variant="info"
                            className="me-2 mb-2"
                            onClick={() => {
                                setShowIndividualModal(false)
                                setActiveTab('brands')
                            }}
                        >
                            Управление брендами
                        </Button>
                        <Button 
                            variant="warning"
                            className="mb-2"
                            onClick={() => {
                                setShowIndividualModal(false)
                                setActiveTab('categories')
                            }}
                        >
                            Управление категориями
                        </Button>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowIndividualModal(false)}
                    >
                        Закрыть
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
})

export default FilterManager