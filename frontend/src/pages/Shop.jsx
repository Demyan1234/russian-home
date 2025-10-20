import { observer } from 'mobx-react-lite'
import { useContext, useEffect, useState, useRef } from 'react'
import { Container, Row, Col, Alert, Button, Spinner } from 'react-bootstrap' 
import { AppContext } from '../context/ContextProvider'
import { fetchCategories, fetchBrands, fetchProducts } from '../http/catalogAPI'
import ProductList from '../components/ProductList'
import SidebarFilter from '../components/SidebarFilter'
import CategoryBar from '../components/CategoryBar'
import SortDropdown from '../components/SortDropdown'
import { useLocation, useNavigate } from 'react-router-dom'

const Shop = observer(() => {
    const { catalog } = useContext(AppContext)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [sort, setSort] = useState({ sortBy: 'created_at', sortOrder: 'DESC' })
    const hasLoaded = useRef(false)
    const location = useLocation()
    const navigate = useNavigate()

    const getQueryParams = () => {
        const searchParams = new URLSearchParams(location.search)
        const params = {
            category: searchParams.get('category'),
            brand: searchParams.get('brand'),
            minPrice: searchParams.get('minPrice'),
            maxPrice: searchParams.get('maxPrice'),
            material: searchParams.get('material'),
            color: searchParams.get('color'),
            page: searchParams.get('page') || 1,
            limit: searchParams.get('limit') || 12,
            sortBy: searchParams.get('sortBy') || sort.sortBy,
            sortOrder: searchParams.get('sortOrder') || sort.sortOrder
        }
        
        const cleanParams = {}
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== '' && params[key] !== 'null') {
                cleanParams[key] = params[key]
            }
        })
        
        return cleanParams
    }

    const updateSortInURL = (newSort) => {
        const searchParams = new URLSearchParams(location.search)
        searchParams.set('sortBy', newSort.sortBy)
        searchParams.set('sortOrder', newSort.sortOrder)
        
        navigate({ search: searchParams.toString() }, { replace: true })
    }

    const handleSortChange = (sortOption) => {
        const newSort = {
            sortBy: sortOption.sortBy,
            sortOrder: sortOption.sortOrder
        }
        setSort(newSort)
        updateSortInURL(newSort)
    }

    const loadData = async () => {
        try {
            setError('')
            setLoading(true)

            const queryParams = getQueryParams()
            
            if (queryParams.sortBy && queryParams.sortOrder) {
                setSort({
                    sortBy: queryParams.sortBy,
                    sortOrder: queryParams.sortOrder
                })
            }
            
            console.log(' Shop: Загрузка с параметрами:', queryParams)

            const [categoriesData, brandsData, productsData] = await Promise.all([
                fetchCategories().catch(err => []),
                fetchBrands().catch(err => []),
                fetchProducts(queryParams).catch(err => ({ products: [], totalCount: 0 }))
            ])
            
            catalog.categories = categoriesData || []
            catalog.brands = brandsData || []
            
            const products = productsData.data?.products || productsData.products || []
            const count = productsData.data?.pagination?.totalCount || productsData.totalCount || 0
            
            catalog.products = products
            catalog.count = count
            
            console.log(' Структура ответа productsData:', productsData)
            console.log(` Shop: Загружено ${products.length} товаров`)

        } catch (error) {
            console.error(' Shop: Ошибка:', error)
            setError(`Ошибка загрузки: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        console.log(' Shop: URL изменился', location.search)
        loadData()
    }, [location.search]) 

    if (loading) {
        return (
            <Container className="text-center py-5">
                <Spinner animation="border" />
                <div className="mt-3">Загрузка каталога...</div>
            </Container>
        )
    }

    return (
        <Container className="py-4">
            <div style={{ position: 'relative', zIndex: 1000 }}>
                <CategoryBar />
            </div>

            {error && (
                <Alert variant="warning" className="mt-3">
                    <Alert.Heading>Проблема с подключением</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="primary" onClick={loadData}>
                        Повторить загрузку
                    </Button>
                </Alert>
            )}

            
<Row className="mt-4 mb-3">
    <Col className="d-flex justify-content-end">
        <div className="d-flex align-items-center">
            <span className="me-2 text-nowrap">Сортировка:</span>
            <SortDropdown 
                onSortChange={handleSortChange}
                currentSort={sort}
            />
        </div>
    </Col>
</Row>

            <Row className="mt-2">
                <Col md={3}>
                    <SidebarFilter />
                </Col>
                <Col md={9}>
                    <ProductList products={catalog.products} />
                    
                    
                    {catalog.products.length > 0 && (
                        <div className="mt-3 text-muted small">
                            Показано {catalog.products.length} товаров 
                            {sort.sortBy === 'price' && (
                                sort.sortOrder === 'ASC' ? ' (по возрастанию цены)' : ' (по убыванию цены)'
                            )}
                            {sort.sortBy === 'name' && (
                                sort.sortOrder === 'ASC' ? ' (по алфавиту А-Я)' : ' (по алфавиту Я-А)'
                            )}
                            {sort.sortBy === 'created_at' && (
                                sort.sortOrder === 'DESC' ? ' (сначала новые)' : ' (сначала старые)'
                            )}
                            {sort.sortBy === 'discount_percent' && ' (по размеру скидки)'}
                        </div>
                    )}
                </Col>
            </Row>
        </Container>
    )
})

export default Shop