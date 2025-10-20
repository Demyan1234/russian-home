import { Modal, Button, Form, Row, Col, Alert, Card, InputGroup } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { fetchCategories, fetchBrands, createProduct, createCategory, createBrand } from '../../http/catalogAPI'

const CreateProduct = ({ show, setShow, setChange }) => {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [description, setDescription] = useState('')
    const [categoryInput, setCategoryInput] = useState('')
    const [brandInput, setBrandInput] = useState('')
    const [materialInput, setMaterialInput] = useState('')
    const [colorInput, setColorInput] = useState('')
    const [stockQuantity, setStockQuantity] = useState(10)
    const [images, setImages] = useState([]) 
    const [mainImageIndex, setMainImageIndex] = useState(0) 
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const materialSuggestions = [
        'Керамика', 'Нержавеющая сталь', 'Чугун', 'Акрил', 
        'Стекло', 'Дерево', 'Пластик', 'Камень', 'Фаянс', 'Хром'
    ]
    
    const colorSuggestions = [
        'Белый', 'Хром', 'Черный', 'Серебристый', 'Золотой', 
        'Бронзовый', 'Серый', 'Бежевый', 'Коричневый', 'Прозрачный'
    ]

    const [activeMaterials, setActiveMaterials] = useState([])
    const [activeColors, setActiveColors] = useState([])

    useEffect(() => {
        if (show) {
            loadExistingData()
            loadActiveFilters()
        }
    }, [show])

    const loadExistingData = async () => {
        try {
            const [categoriesData, brandsData] = await Promise.all([
                fetchCategories(),
                fetchBrands()
            ])
            setCategories(categoriesData)
            setBrands(brandsData)
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error)
            setError('Ошибка загрузки категорий и брендов')
        }
    }

    const loadActiveFilters = () => {
        try {
            const savedMaterials = JSON.parse(localStorage.getItem('availableMaterials')) 
            const savedColors = JSON.parse(localStorage.getItem('availableColors'))

            setActiveMaterials(savedMaterials || materialSuggestions)
            setActiveColors(savedColors || colorSuggestions)
            
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error)
            setActiveMaterials(materialSuggestions)
            setActiveColors(colorSuggestions)
        }
    }

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        
        if (images.length + files.length > 10) {
            setError('Максимум 10 изображений на товар')
            return
        }

        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }))

        setImages(prev => [...prev, ...newImages])
        setError('')
    }

    const removeImage = (index) => {
        URL.revokeObjectURL(images[index].preview)
        
        setImages(prev => prev.filter((_, i) => i !== index))
        
        if (mainImageIndex >= index && mainImageIndex > 0) {
            setMainImageIndex(prev => prev - 1)
        }
    }

    const setAsMain = (index) => {
        setMainImageIndex(index)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (images.length === 0) {
            setError('Добавьте хотя бы одно изображение')
            setLoading(false)
            return
        }

        if (!name.trim()) {
            setError('Введите название товара')
            setLoading(false)
            return
        }
        if (!price || parseFloat(price) <= 0) {
            setError('Введите корректную цену')
            setLoading(false)
            return
        }
        if (!categoryInput.trim()) {
            setError('Введите категорию')
            setLoading(false)
            return
        }
        if (!brandInput.trim()) {
            setError('Введите бренд')
            setLoading(false)
            return
        }
        if (!materialInput.trim()) {
            setError('Введите материал')
            setLoading(false)
            return
        }
        if (!colorInput.trim()) {
            setError('Введите цвет')
            setLoading(false)
            return
        }

        try {
            let categoryId = null
            let brandId = null

            const existingCategory = categories.find(cat => 
                cat.name.toLowerCase() === categoryInput.trim().toLowerCase()
            )

            if (existingCategory) {
                categoryId = existingCategory.id
                console.log(' Используем существующую категорию:', existingCategory.name)
            } else {
                console.log(' Создаем новую категорию:', categoryInput)
                const newCategory = await createCategory({ 
                    name: categoryInput.trim(),
                    description: `Категория ${categoryInput.trim()}`
                })
                categoryId = newCategory.data?.id || newCategory.id
                await loadExistingData() 
            }

            const existingBrand = brands.find(brand => 
                brand.name.toLowerCase() === brandInput.trim().toLowerCase()
            )

            if (existingBrand) {
                brandId = existingBrand.id
                console.log(' Используем существующий бренд:', existingBrand.name)
            } else {
                console.log(' Создаем новый бренд:', brandInput)
                const newBrand = await createBrand({ 
                    name: brandInput.trim(),
                    description: `Бренд ${brandInput.trim()}`
                })
                brandId = newBrand.data?.id || newBrand.id
                await loadExistingData() 
            }

            if (!activeMaterials.includes(materialInput.trim())) {
                const updatedMaterials = [...activeMaterials, materialInput.trim()]
                setActiveMaterials(updatedMaterials)
                localStorage.setItem('availableMaterials', JSON.stringify(updatedMaterials))
                console.log(' Добавлен новый материал:', materialInput.trim())
            }

            if (!activeColors.includes(colorInput.trim())) {
                const updatedColors = [...activeColors, colorInput.trim()]
                setActiveColors(updatedColors)
                localStorage.setItem('availableColors', JSON.stringify(updatedColors))
                console.log(' Добавлен новый цвет:', colorInput.trim())
            }

            const formData = new FormData()
            formData.append('name', name.trim())
            formData.append('price', parseFloat(price))
            formData.append('description', description.trim())
            formData.append('stock_quantity', parseInt(stockQuantity))
            formData.append('material', materialInput.trim())
            formData.append('color', colorInput.trim())
            formData.append('main_image_index', mainImageIndex) 
            
            if (categoryId) formData.append('category_id', categoryId)
            if (brandId) formData.append('brand_id', brandId)
            
            images.forEach((image, index) => {
                formData.append('images', image.file)
            })

            await createProduct(formData)

            images.forEach(image => URL.revokeObjectURL(image.preview))

            resetForm()
            setShow(false)
            setChange(prev => !prev)
            
            alert(`Товар успешно создан с ${images.length} изображениями! Категория и бренд автоматически обработаны.`)
            
        } catch (error) {
            console.error('Ошибка создания товара:', error)
            setError(error.message || 'Ошибка при создании товара')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setName('')
        setPrice('')
        setDescription('')
        setCategoryInput('')
        setBrandInput('')
        setMaterialInput('')
        setColorInput('')
        setStockQuantity(10)
        setImages([]) 
        setMainImageIndex(0) 
        setError('')
    }

    const handleClose = () => {
        images.forEach(image => URL.revokeObjectURL(image.preview))
        setShow(false)
        resetForm()
    }

    const handleMaterialSelect = (material) => {
        setMaterialInput(material)
    }

    const handleColorSelect = (color) => {
        setColorInput(color)
    }

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Добавить товар</Modal.Title>
            </Modal.Header>
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Название товара *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Введите название товара"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Цена (руб) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Описание товара</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Опишите товар..."
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Категория *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={categoryInput}
                                    onChange={e => setCategoryInput(e.target.value)}
                                    placeholder="Введите название категории"
                                    required
                                    list="categorySuggestions"
                                />
                                <datalist id="categorySuggestions">
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name} />
                                    ))}
                                </datalist>
                                <Form.Text className="text-muted">
                                    {categories.find(cat => cat.name.toLowerCase() === categoryInput.toLowerCase()) 
                                        ? ' Используем существующую категорию' 
                                        : ' Будет создана новая категорию'
                                    }
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Бренд *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={brandInput}
                                    onChange={e => setBrandInput(e.target.value)}
                                    placeholder="Введите название бренда"
                                    required
                                    list="brandSuggestions"
                                />
                                <datalist id="brandSuggestions">
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.name} />
                                    ))}
                                </datalist>
                                <Form.Text className="text-muted">
                                    {brands.find(brand => brand.name.toLowerCase() === brandInput.toLowerCase()) 
                                        ? ' Используем существующий бренд' 
                                        : ' Будет создан новый бренд'
                                    }
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Материал *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={materialInput}
                                    onChange={e => setMaterialInput(e.target.value)}
                                    placeholder="Введите материал"
                                    required
                                    list="materialSuggestions"
                                />
                                <datalist id="materialSuggestions">
                                    {activeMaterials.map(mat => (
                                        <option key={mat} value={mat} />
                                    ))}
                                </datalist>
                                <div className="mt-2">
                                    <small className="text-muted">Быстрый выбор:</small>
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {activeMaterials.map(material => (
                                            <Button
                                                key={material}
                                                variant={materialInput === material ? "primary" : "outline-secondary"}
                                                size="sm"
                                                onClick={() => handleMaterialSelect(material)}
                                                className="mb-1"
                                            >
                                                {material}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Цвет *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={colorInput}
                                    onChange={e => setColorInput(e.target.value)}
                                    placeholder="Введите цвет"
                                    required
                                    list="colorSuggestions"
                                />
                                <datalist id="colorSuggestions">
                                    {activeColors.map(color => (
                                        <option key={color} value={color} />
                                    ))}
                                </datalist>
                                <div className="mt-2">
                                    <small className="text-muted">Быстрый выбор:</small>
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                        {activeColors.map(color => (
                                            <Button
                                                key={color}
                                                variant={colorInput === color ? "primary" : "outline-secondary"}
                                                size="sm"
                                                onClick={() => handleColorSelect(color)}
                                                className="mb-1"
                                            >
                                                {color}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Количество на складе</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={stockQuantity}
                                    onChange={e => setStockQuantity(e.target.value)}
                                    min="0"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Изображения товара ({images.length}/10) *
                                    {images.length > 0 && (
                                        <span className="text-success ms-2">
                                            Главное: фото {mainImageIndex + 1}
                                        </span>
                                    )}
                                </Form.Label>
                                <Form.Control
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="mb-3"
                                />
                                
                                {images.length > 0 && (
                                    <div className="image-previews">
                                        <Row className="g-2">
                                            {images.map((image, index) => (
                                                <Col xs={6} md={4} lg={3} key={index}>
                                                    <div className={`image-preview-card ${index === mainImageIndex ? 'main-image' : ''}`}>
                                                        <img
                                                            src={image.preview}
                                                            alt={`Preview ${index + 1}`}
                                                            className="img-fluid rounded"
                                                            style={{
                                                                height: '100px',
                                                                width: '100%',
                                                                objectFit: 'cover',
                                                                border: index === mainImageIndex ? '3px solid #28a745' : '1px solid #dee2e6'
                                                            }}
                                                        />
                                                        <div className="preview-actions mt-1">
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                className="w-100"
                                                                onClick={() => removeImage(index)}
                                                            >
                                                                Удалить
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                )}
                                
                                <Form.Text className="text-muted">
                                    Можно загрузить до 10 изображений. Первое изображение будет главным по умолчанию.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {(name || description) && (
                        <Card className="mt-3">
                            <Card.Header>
                                <strong>Предпросмотр товара:</strong>
                            </Card.Header>
                            <Card.Body>
                                <h5>{name || 'Название товара'}</h5>
                                <p>{description || 'Описание товара...'}</p>
                                
                                {images.length > 0 && (
                                    <div className="mb-3">
                                        <strong>Изображения ({images.length}):</strong>
                                        <div className="d-flex flex-wrap gap-2 mt-2">
                                            {images.map((image, index) => (
                                                <div key={index} className="position-relative">
                                                    <img
                                                        src={image.preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="rounded border"
                                                        style={{
                                                            width: '60px',
                                                            height: '60px',
                                                            objectFit: 'cover',
                                                            border: index === mainImageIndex ? '2px solid #28a745' : '1px solid #dee2e6'
                                                        }}
                                                    />
                                                    {index === mainImageIndex && (
                                                        <span className="position-absolute top-0 start-100 translate-middle badge bg-success">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="row small text-muted">
                                    <div className="col-6">
                                        <strong>Категория:</strong> {categoryInput || 'Не указана'}
                                        {categories.find(cat => cat.name.toLowerCase() === categoryInput.toLowerCase()) 
                                            ? ' (существующая)' 
                                            : ' (новая)'
                                        }
                                    </div>
                                    <div className="col-6">
                                        <strong>Бренд:</strong> {brandInput || 'Не указан'}
                                        {brands.find(brand => brand.name.toLowerCase() === brandInput.toLowerCase()) 
                                            ? ' (существующий)' 
                                            : ' (новый)'
                                        }
                                    </div>
                                    <div className="col-6">
                                        <strong>Материал:</strong> {materialInput || 'Не указан'}
                                        {activeMaterials.includes(materialInput) 
                                            ? ' (активный)' 
                                            : ' (новый)'
                                        }
                                    </div>
                                    <div className="col-6">
                                        <strong>Цвет:</strong> {colorInput || 'Не указан'}
                                        {activeColors.includes(colorInput) 
                                            ? ' (активный)' 
                                            : ' (новый)'
                                        }
                                    </div>
                                    <div className="col-6">
                                        <strong>Цена:</strong> {price ? `${price} руб.` : 'Не указана'}
                                    </div>
                                    <div className="col-6">
                                        <strong>На складе:</strong> {stockQuantity} шт.
                                    </div>
                                    <div className="col-12">
                                        <strong>Изображений:</strong> {images.length} шт.
                                        {images.length > 0 && ` (главное: ${mainImageIndex + 1})`}
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                </Modal.Body>
                
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Отмена
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading || images.length === 0}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Создание...
                            </>
                        ) : (
                            'Создать товар'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default CreateProduct