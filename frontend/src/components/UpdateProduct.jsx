import { Modal, Button, Form, Row, Col, Alert, Card, Spinner } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { fetchCategories, fetchBrands, updateProduct, fetchOneProduct, createCategory, createBrand } from '../http/catalogAPI'

const UpdateProduct = ({ id, show, setShow, setChange }) => {
    const [name, setName] = useState('')
    const [price, setPrice] = useState('')
    const [description, setDescription] = useState('')
    const [categoryInput, setCategoryInput] = useState('')
    const [brandInput, setBrandInput] = useState('')
    const [materialInput, setMaterialInput] = useState('')
    const [colorInput, setColorInput] = useState('')
    const [stockQuantity, setStockQuantity] = useState(10)
    const [image, setImage] = useState(null)
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [existingImages, setExistingImages] = useState([]) 
    const [newImages, setNewImages] = useState([]) 
    const [mainImageIndex, setMainImageIndex] = useState(0) 


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
        if (show && id) {
            loadAllData()
        }
    }, [show, id])


const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
        return `http://localhost:3000${imagePath}`;
    }
    
    return `http://localhost:3000/uploads/${imagePath}`;
};

    const loadAllData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                loadExistingData(),
                loadActiveFilters()
            ])
        } catch (error) {
            console.error('Ошибка загрузки данных:', error)
            setError('Ошибка загрузки данных товара')
        } finally {
            setLoading(false)
        }
    }

const loadExistingData = async () => {
    try {
        setLoading(true);
        
        // Затем загружаем данные
        const [categoriesData, brandsData, productData] = await Promise.allSettled([
            fetchCategories(),
            fetchBrands(),
            fetchOneProduct(id)
        ]);

        // Обрабатываем результаты
        let categories = [];
        let brands = [];

        if (categoriesData.status === 'fulfilled') {
            categories = categoriesData.value;
            setCategories(categories);
        } else {
            console.error('Categories load error:', categoriesData.reason);
        }

        if (brandsData.status === 'fulfilled') {
            brands = brandsData.value;
            setBrands(brands);
        } else {
            console.error('Brands load error:', brandsData.reason);
        }

        if (productData.status === 'fulfilled') {
            const product = productData.value;
            console.log('✅ Loaded product:', product);
            
            // Заполняем форму данными товара
            setName(product.name || '');
            setPrice(product.price || '');
            setDescription(product.description || '');
            
            // Находим названия категории и бренда по их ID
            const categoryName = product.category_id ? 
                categories.find(c => c.id === product.category_id)?.name || '' 
                : '';
            const brandName = product.brand_id ? 
                brands.find(b => b.id === product.brand_id)?.name || '' 
                : '';
                
            setCategoryInput(categoryName);
            setBrandInput(brandName);
            setMaterialInput(product.material || '');
            setColorInput(product.color || '');
            setStockQuantity(product.stock_quantity || 0);
            setExistingImages(product.images || []);
            setMainImageIndex(0);
            
            console.log('📝 Form filled:', { 
                categoryName, 
                brandName, 
                material: product.material,
                color: product.color 
            });
        } else {
            console.error('❌ Product load error:', productData.reason);
            setError('Не удалось загрузить данные товара. Проверьте ID товара.');
        }

    } catch (error) {
        console.error('❌ Load existing data error:', error);
        setError('Ошибка загрузки данных: ' + error.message);
    } finally {
        setLoading(false);
    }
};

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        
        if (existingImages.length + newImages.length + files.length > 10) {
            setError('Максимум 10 изображений на товар')
            return
        }

        const newImagePreviews = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }))

        setNewImages(prev => [...prev, ...newImagePreviews])
        setError('')
    }

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index))
        if (mainImageIndex === index && existingImages.length > 1) {
            setMainImageIndex(0)
        }
    }

    const removeNewImage = (index) => {
        URL.revokeObjectURL(newImages[index].preview)
        setNewImages(prev => prev.filter((_, i) => i !== index))
    }

    const setAsMain = (index, type = 'existing') => {
        if (type === 'existing') {
            setMainImageIndex(index)
        } else {
            setMainImageIndex(existingImages.length + index)
        }
    }

    const loadActiveFilters = () => {
        try {
            const savedMaterials = JSON.parse(localStorage.getItem('availableMaterials')) || []
            const savedColors = JSON.parse(localStorage.getItem('availableColors')) || []
            
            const allMaterials = [...new Set([...materialSuggestions, ...savedMaterials])]
            const allColors = [...new Set([...colorSuggestions, ...savedColors])]
            
            setActiveMaterials(allMaterials)
            setActiveColors(allColors)
            
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error)
            setActiveMaterials(materialSuggestions)
            setActiveColors(colorSuggestions)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

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
        let categoryCreated = false
        let brandCreated = false

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
            categoryCreated = true
            const updatedCategories = await fetchCategories()
            setCategories(updatedCategories)
        }

        const existingBrand = brands.find(brand => 
            brand.name.toLowerCase() === brandInput.trim().toLowerCase()
        )

        if (existingBrand) {
            brandId = existingBrand.id
            console.log(' Используем существующий бренд:', existingBrand.name)
        } else {
            console.log('Создаем новый бренд:', brandInput)
            const newBrand = await createBrand({ 
                name: brandInput.trim(),
                description: `Бренд ${brandInput.trim()}`
            })
            brandId = newBrand.data?.id || newBrand.id
            brandCreated = true
            const updatedBrands = await fetchBrands()
            setBrands(updatedBrands)
        }

        let materialAdded = false
        let colorAdded = false
        let updatedMaterials = [...activeMaterials]
        let updatedColors = [...activeColors]
        
        if (materialInput.trim() && !activeMaterials.includes(materialInput.trim())) {
            updatedMaterials = [...activeMaterials, materialInput.trim()]
            setActiveMaterials(updatedMaterials)
            localStorage.setItem('availableMaterials', JSON.stringify(updatedMaterials))
            materialAdded = true
            console.log(' Добавлен новый материал:', materialInput.trim())
        }

        if (colorInput.trim() && !activeColors.includes(colorInput.trim())) {
            updatedColors = [...activeColors, colorInput.trim()]
            setActiveColors(updatedColors)
            localStorage.setItem('availableColors', JSON.stringify(updatedColors))
            colorAdded = true
            console.log(' Добавлен новый цвет:', colorInput.trim())
        }

        const formData = new FormData()
        
        formData.append('name', name.trim())
        formData.append('price', parseFloat(price))
        formData.append('description', description.trim())
        formData.append('stock_quantity', parseInt(stockQuantity))
        formData.append('material', materialInput.trim())  
        formData.append('color', colorInput.trim())        
        
        if (categoryId) formData.append('category_id', categoryId)
        if (brandId) formData.append('brand_id', brandId)
            newImages.forEach(image => {
                formData.append('images', image.file)
            })

        console.log('Отправляемые данные:')
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value)
        }

        const updatedProduct = await updateProduct(id, formData)
        console.log('Товар обновлен:', updatedProduct)

    newImages.forEach(image => URL.revokeObjectURL(image.preview))

        await updateAllData()

        setShow(false)
        
        let message = ' Товар успешно обновлен!'
        const changes = []
        
        if (newImages.length > 0) changes.push(`добавлено ${newImages.length} новых изображений`)

        if (categoryCreated) changes.push('создана новая категория')
        if (brandCreated) changes.push('создан новый бренд')
        if (materialAdded) changes.push('добавлен новый материал')
        if (colorAdded) changes.push('добавлен новый цвет')
        if (image) changes.push('обновлено изображение')
        
        if (changes.length > 0) {
            message += `\n\nТакже:\n• ${changes.join('\n• ')}`
        }
        
        alert(message)
        
    } catch (error) {
        console.error('Ошибка обновления товара:', error)
        setError(error.message || 'Ошибка при обновлении товара')
    } finally {
        setLoading(false)
    }
}

    const updateAllData = async () => {
        try {
            const [newCategories, newBrands] = await Promise.all([
                fetchCategories(),
                fetchBrands()
            ])
            
            setCategories(newCategories)
            setBrands(newBrands)
            
            loadActiveFilters()
            
            setChange(prev => !prev)
            
            console.log(' Все данные успешно обновлены')
            
        } catch (error) {
            console.error('Ошибка обновления данных:', error)
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
    setExistingImages([]) 
    setNewImages([]) 
    setMainImageIndex(0) 
    setError('')
}

    const handleClose = () => {
        newImages.forEach(image => URL.revokeObjectURL(image.preview))
        setShow(false)
        resetForm()
    }

    const handleMaterialSelect = (material) => {
        setMaterialInput(material)
    }

    const handleColorSelect = (color) => {
        setColorInput(color)
    }

    if (loading && !name) {
        return (
            <Modal show={show} onHide={handleClose}>
                <Modal.Body className="text-center">
                    <Spinner animation="border" />
                    <p>Загрузка данных товара...</p>
                </Modal.Body>
            </Modal>
        )
    }

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Редактирование товара</Modal.Title>
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
                                        ? 'Используем существующую категорию' 
                                        : 'Будет создана новая категория'
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
            Изображения товара ({existingImages.length + newImages.length}/10)
            {(existingImages.length + newImages.length) > 0 && (
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
        
        {existingImages.length > 0 && (
            <div className="mb-3">
                <h6>Существующие изображения:</h6>
                <Row className="g-2">
                    {existingImages.map((image, index) => (
                        <Col xs={6} md={4} lg={3} key={`existing-${index}`}>
                            <div className={`image-preview-card ${index === mainImageIndex ? 'main-image' : ''}`}>
                                <img
                                    src={getImageUrl(image)} 
                                    alt={`Existing ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{
                                        height: '100px',
                                        width: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div className="preview-actions mt-1">
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="w-100"
                                        onClick={() => removeExistingImage(index)}
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
        
        {newImages.length > 0 && (
            <div className="mb-3">
                <h6>Новые изображения:</h6>
                <Row className="g-2">
                    {newImages.map((image, index) => (
                        <Col xs={6} md={4} lg={3} key={`new-${index}`}>
                            <div className={`image-preview-card ${existingImages.length + index === mainImageIndex ? 'main-image' : ''}`}>
                                <img
                                    src={image.preview}
                                    alt={`New ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{
                                        height: '100px',
                                        width: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div className="preview-actions mt-1">
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="w-100"
                                        onClick={() => removeNewImage(index)}
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
                                    Можно загрузить до 10 изображений. Выберите главное изображение.
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
                                </div>
                                {image && (
                                    <div className="mt-2">
                                        <small>Новое изображение: {image.name}</small>
                                    </div>
                                )}
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
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Сохранение...
                            </>
                        ) : (
                            'Сохранить изменения'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default UpdateProduct