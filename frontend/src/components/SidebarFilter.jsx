
import { observer } from 'mobx-react-lite'
import { useContext, useEffect, useState, useMemo } from 'react'
import { AppContext } from '../context/ContextProvider'
import { Card, Form, Button, Row, Col, Accordion } from 'react-bootstrap'
import { useNavigate, useLocation } from 'react-router-dom'

const SidebarFilter = observer(() => {
    const { catalog } = useContext(AppContext)
    const navigate = useNavigate()
    const location = useLocation()

    const { availableMaterials, availableColors } = useMemo(() => {
        if (!catalog.products || catalog.products.length === 0) {
            return { availableMaterials: [], availableColors: [] }
        }

        const materials = [...new Set(catalog.products
            .map(product => product.material)
            .filter(material => material && material !== '')
        )].sort()

        const colors = [...new Set(catalog.products
            .map(product => product.color)
            .filter(color => color && color !== '')
        )].sort()

        console.log(' Доступные материалы:', materials)
        console.log(' Доступные цвета:', colors)

        return { availableMaterials: materials, availableColors: colors }
    }, [catalog.products])

    const updateURL = (newParams) => {
        const searchParams = new URLSearchParams(location.search)
        
        Object.keys(newParams).forEach(key => {
            if (newParams[key] === null || newParams[key] === '') {
                searchParams.delete(key)
            } else {
                searchParams.set(key, newParams[key])
            }
        })
        
        navigate(`/shop?${searchParams.toString()}`, { replace: true })
    }

    const handleBrandChange = (brandId) => {
        updateURL({ brand: brandId })
    }

    const handleMaterialChange = (material) => {
        updateURL({ material: material })
    }

    const handleColorChange = (color) => {
        updateURL({ color: color })
    }

    const handlePriceRangeChange = (min, max) => {
        updateURL({ 
            minPrice: min !== null ? min : '',
            maxPrice: max !== null ? max : ''
        })
    }

    const handleCustomPriceChange = (type, value) => {
        const searchParams = new URLSearchParams(location.search)
        
        if (value) {
            searchParams.set(type, value)
        } else {
            searchParams.delete(type)
        }
        
        navigate(`/shop?${searchParams.toString()}`, { replace: true })
    }

    const resetFilters = () => {
        navigate('/shop', { replace: true })
    }

    const priceRanges = [
        { label: 'Любая цена', min: null, max: null },
        { label: 'До 5 000 ₽', min: null, max: 5000 },
        { label: '5 000 - 10 000 ₽', min: 5000, max: 10000 },
        { label: '10 000 - 20 000 ₽', min: 10000, max: 20000 },
        { label: '20 000 - 50 000 ₽', min: 20000, max: 50000 },
        { label: 'Свыше 50 000 ₽', min: 50000, max: null }
    ]

    const getCurrentParams = () => {
        const searchParams = new URLSearchParams(location.search)
        return {
            brand: searchParams.get('brand'),
            material: searchParams.get('material'), 
            color: searchParams.get('color'),
            minPrice: searchParams.get('minPrice'),
            maxPrice: searchParams.get('maxPrice')
        }
    }

    const currentParams = getCurrentParams()

    return (
        <Card className="sticky-top" style={{ top: '20px' }}>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Фильтры</h5>
                <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={resetFilters}
                >
                    Сбросить
                </Button>
            </Card.Header>
            
            <Card.Body>
                <Accordion defaultActiveKey={['0', '1', '2', '3']} alwaysOpen>
                    {/* Бренды */}
                    <Accordion.Item eventKey="0">
                        <Accordion.Header> Бренды</Accordion.Header>
                        <Accordion.Body>
                            <Form>
                                <Form.Check
                                    type="radio"
                                    name="brand"
                                    label="Все бренды"
                                    checked={!currentParams.brand}
                                    onChange={() => handleBrandChange(null)}
                                    className="mb-2"
                                />
                                {catalog.brands && catalog.brands.map(brand => (
                                    <Form.Check
                                        key={brand.id}
                                        type="radio"
                                        name="brand"
                                        label={brand.name}
                                        checked={currentParams.brand === brand.id.toString()}
                                        onChange={() => handleBrandChange(brand.id.toString())}
                                        className="mb-2"
                                    />
                                ))}
                            </Form>
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Цена */}
                    <Accordion.Item eventKey="1">
                        <Accordion.Header> Цена</Accordion.Header>
                        <Accordion.Body>
                            <div className="mb-3">
                                {priceRanges.map((range, index) => (
                                    <Form.Check
                                        key={index}
                                        type="radio"
                                        name="priceRange"
                                        label={range.label}
                                        checked={currentParams.minPrice === (range.min?.toString() || '') && 
                                                currentParams.maxPrice === (range.max?.toString() || '')}
                                        onChange={() => handlePriceRangeChange(range.min, range.max)}
                                        className="mb-2"
                                    />
                                ))}
                            </div>
                            
                            <Row className="g-2">
                                <Col>
                                    <Form.Control
                                        type="number"
                                        placeholder="От"
                                        value={currentParams.minPrice || ''}
                                        onChange={(e) => handleCustomPriceChange('minPrice', e.target.value)}
                                    />
                                </Col>
                                <Col>
                                    <Form.Control
                                        type="number"
                                        placeholder="До"
                                        value={currentParams.maxPrice || ''}
                                        onChange={(e) => handleCustomPriceChange('maxPrice', e.target.value)}
                                    />
                                </Col>
                            </Row>
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Материал  */}
                    <Accordion.Item eventKey="2">
                        <Accordion.Header> Материал ({availableMaterials.length})</Accordion.Header>
                        <Accordion.Body>
                            <Form>
                                <Form.Check
                                    type="radio"
                                    name="material"
                                    label="Любой материал"
                                    checked={!currentParams.material}
                                    onChange={() => handleMaterialChange(null)}
                                    className="mb-2"
                                />
                                {availableMaterials.length > 0 ? (
                                    availableMaterials.map(material => (
                                        <Form.Check
                                            key={material}
                                            type="radio"
                                            name="material"
                                            label={material}
                                            checked={currentParams.material === material}
                                            onChange={() => handleMaterialChange(material)}
                                            className="mb-2"
                                        />
                                    ))
                                ) : (
                                    <small className="text-muted">Нет доступных материалов</small>
                                )}
                            </Form>
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Цвет */}
                    <Accordion.Item eventKey="3">
                        <Accordion.Header> Цвет ({availableColors.length})</Accordion.Header>
                        <Accordion.Body>
                            <Form>
                                <Form.Check
                                    type="radio"
                                    name="color"
                                    label="Любой цвет"
                                    checked={!currentParams.color}
                                    onChange={() => handleColorChange(null)}
                                    className="mb-2"
                                />
                                {availableColors.length > 0 ? (
                                    availableColors.map(color => (
                                        <Form.Check
                                            key={color}
                                            type="radio"
                                            name="color"
                                            label={color}
                                            checked={currentParams.color === color}
                                            onChange={() => handleColorChange(color)}
                                            className="mb-2"
                                        />
                                    ))
                                ) : (
                                    <small className="text-muted">Нет доступных цветов</small>
                                )}
                            </Form>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </Card.Body>
        </Card>
    )
})

export default SidebarFilter