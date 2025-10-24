import React, { useState, useEffect, useContext } from 'react'
import { Container, Row, Col, Card, Button, Tab, Tabs, Alert, Badge, Spinner, Form, Table } from 'react-bootstrap'
import { AppContext } from '../context/ContextProvider'
import { managerAPI } from '../http/managerAPI'
import CreateProduct from '../components/Admin/CreateProduct'
import UpdateProduct from '../components/UpdateProduct'
import { useReviewStats } from '../hooks/useReviewStats'

const ProductsList = ({ products, loading, onEdit, onDelete, onCreate }) => {
  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <div className="mt-2">Загрузка товаров...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Товары ({products.length})</h5>
        <Button 
          variant="success" 
          onClick={onCreate}
        >
          + Добавить товар
        </Button>
      </div>

      {products.length === 0 ? (
        <Alert variant="info">
          Нет товаров для отображения
        </Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Категория</th>
              <th>Бренд</th>
              <th>На складе</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>
                  <strong>{product.name}</strong>
                  {product.discount_percent > 0 && (
                    <Badge bg="danger" className="ms-2">
                      -{product.discount_percent}%
                    </Badge>
                  )}
                </td>
                <td>{product.price} руб.</td>
                <td>{product.category_name || '-'}</td>
                <td>{product.brand_name || '-'}</td>
                <td>
                  <span className={product.stock_quantity < 5 ? 'text-danger fw-bold' : ''}>
                    {product.stock_quantity} шт.
                  </span>
                </td>
                <td>
                  <Button
                    variant="warning"
                    size="sm"
                    className="me-2"
                    onClick={() => onEdit(product.id)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(product.id, product.name)}
                  >
                    Удалить
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

const ReviewsModeration = ({ reviews, loading, onApprove, onReject, stats }) => {
  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <div className="mt-2">Загрузка отзывов...</div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const variants = {
      'approved': { bg: 'success', text: 'Одобрено' },
      'rejected': { bg: 'danger', text: 'Отклонено' },
      'pending': { bg: 'warning', text: 'На модерации' }
    };
    
    const variant = variants[status] || { bg: 'secondary', text: 'Не проверен' };
    return <Badge bg={variant.bg}>{variant.text}</Badge>;
  };

  return (
    <div>
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body className="py-3">
              <Card.Title className="text-primary fs-2">{stats.total_reviews || 0}</Card.Title>
              <Card.Text className="text-muted">Всего отзывов</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body className="py-3">
              <Card.Title className="text-warning fs-2">{stats.pending_reviews || 0}</Card.Title>
              <Card.Text className="text-muted">На модерации</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body className="py-3">
              <Card.Title className="text-success fs-2">{stats.approved_reviews || 0}</Card.Title>
              <Card.Text className="text-muted">Одобрено</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body className="py-3">
              <Card.Title className="text-danger fs-2">{stats.rejected_reviews || 0}</Card.Title>
              <Card.Text className="text-muted">Отклонено</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {reviews.length === 0 ? (
        <Alert variant="info" className="text-center">
          <h5>Нет отзывов для модерации</h5>
          <p className="mb-0">Все отзывы обработаны или отзывов пока нет.</p>
        </Alert>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <Card key={review.id} className="mb-3 shadow-sm">
              <Card.Body>
                <Row>
                  <Col md={8}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0 text-primary">{review.product_name}</h6>
                      {getStatusBadge(review.status)}
                    </div>
                    
                    <div className="mb-2">
                      <strong>Пользователь:</strong> {review.user_name} ({review.user_email})
                    </div>
                    
                    <div className="mb-2">
                      <strong>Рейтинг:</strong> 
                      <span className="text-warning ms-2">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span className="text-muted ms-2">({review.rating}/5)</span>
                    </div>
                    
                    {review.comment && (
                      <div className="mb-2">
                        <strong>Отзыв:</strong> 
                        <div className="border-start border-3 border-primary ps-3 mt-1 bg-light rounded">
                          {review.comment}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-muted small">
                      <strong>Дата отзыва:</strong> {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      {review.moderated_at && (
                        <span className="ms-3">
                          <strong>Модерирован:</strong> {new Date(review.moderated_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </Col>
                  
                  <Col md={4} className="text-end">
                    {review.status === 'pending' && (
                      <div className="d-grid gap-2">
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => onApprove(review.id)}
                        >
                           Одобрить
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => onReject(review.id)}
                        >
                           Отклонить
                        </Button>
                      </div>
                    )}
                    
                    {review.status === 'approved' && (
                      <div className="text-success">
                        <i>Отзыв одобрен</i>
                      </div>
                    )}
                    
                    {review.status === 'rejected' && (
                      <div className="text-danger">
                        <i>Отзыв отклонен</i>
                      </div>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const FiltersManagement = ({ 
  stats, 
  selectedMaterials, 
  selectedColors, 
  selectedBrands,
  selectedCategories,
  onMaterialSelect, 
  onColorSelect,
  onBrandSelect,
  onCategorySelect,
  onCleanupMaterials, 
  onCleanupColors,
  onCleanupBrands,
  onCleanupCategories
}) => {
  return (
    <div>
      <Row>
        {/* Материалы */}
        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0"> Управление материалами</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  disabled={selectedMaterials.length === 0}
                  onClick={onCleanupMaterials}
                  className="mb-2"
                >
                   Удалить выбранные материалы ({selectedMaterials.length})
                </Button>
                {selectedMaterials.length > 0 && (
                  <div className="small text-muted">
                    Выбрано: {selectedMaterials.join(', ')}
                  </div>
                )}
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded">
                {stats.materials?.length > 0 ? (
                  stats.materials.map(material => (
                    <div key={material.material} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedMaterials.includes(material.material)}
                          onChange={() => onMaterialSelect(material.material)}
                          id={`material-${material.material}`}
                        />
                        <label className="form-check-label" htmlFor={`material-${material.material}`}>
                          {material.material || 'Не указан'}
                        </label>
                      </div>
                      <Badge bg="secondary" pill>{material.product_count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-3 text-muted">
                    Нет данных о материалах
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Цвета */}
        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0"> Управление цветами</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  disabled={selectedColors.length === 0}
                  onClick={onCleanupColors}
                  className="mb-2"
                >
                  Удалить выбранные цвета ({selectedColors.length})
                </Button>
                {selectedColors.length > 0 && (
                  <div className="small text-muted">
                    Выбрано: {selectedColors.join(', ')}
                  </div>
                )}
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded">
                {stats.colors?.length > 0 ? (
                  stats.colors.map(color => (
                    <div key={color.color} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedColors.includes(color.color)}
                          onChange={() => onColorSelect(color.color)}
                          id={`color-${color.color}`}
                        />
                        <label className="form-check-label" htmlFor={`color-${color.color}`}>
                          {color.color || 'Не указан'}
                        </label>
                      </div>
                      <Badge bg="secondary" pill>{color.product_count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-3 text-muted">
                    Нет данных о цветах
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Бренды */}
        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0"> Управление брендами</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  disabled={selectedBrands.length === 0}
                  onClick={onCleanupBrands}
                  className="mb-2"
                >
                   Удалить выбранные бренды ({selectedBrands.length})
                </Button>
                {selectedBrands.length > 0 && (
                  <div className="small text-muted">
                    Выбрано: {selectedBrands.map(id => stats.brands?.find(b => b.id === id)?.name).join(', ')}
                  </div>
                )}
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded">
                {stats.brands?.length > 0 ? (
                  stats.brands.map(brand => (
                    <div key={brand.id} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => onBrandSelect(brand.id)}
                          id={`brand-${brand.id}`}
                        />
                        <label className="form-check-label" htmlFor={`brand-${brand.id}`}>
                          {brand.name}
                        </label>
                      </div>
                      <Badge bg="secondary" pill>{brand.product_count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-3 text-muted">
                    Нет данных о брендах
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Категории */}
        <Col md={6} className="mb-4">
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Управление категориями</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  disabled={selectedCategories.length === 0}
                  onClick={onCleanupCategories}
                  className="mb-2"
                >
                   Удалить выбранные категории ({selectedCategories.length})
                </Button>
                {selectedCategories.length > 0 && (
                  <div className="small text-muted">
                    Выбрано: {selectedCategories.map(id => stats.categories?.find(c => c.id === id)?.name).join(', ')}
                  </div>
                )}
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded">
                {stats.categories?.length > 0 ? (
                  stats.categories.map(category => (
                    <div key={category.id} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => onCategorySelect(category.id)}
                          id={`category-${category.id}`}
                        />
                        <label className="form-check-label" htmlFor={`category-${category.id}`}>
                          {category.name}
                        </label>
                      </div>
                      <Badge bg="secondary" pill>{category.product_count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-3 text-muted">
                    Нет данных о категориях
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const Manager = () => {
  const { user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const { stats: moderationStats, updateStatsAfterAction } = useReviewStats();
  const [filterStats, setFilterStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [error, setError] = useState('');
  const [createShow, setCreateShow] = useState(false);
  const [updateShow, setUpdateShow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  


  useEffect(() => {
    loadModerationStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    } else if (activeTab === 'filters') {
      loadFilterStats();
    } else if (activeTab === 'products') {
      loadProducts();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await managerAPI.getProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Manager: Error loading products:', error);
      setError('Не удалось загрузить товары');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await managerAPI.getReviewsForModeration('pending');
      setReviews(response.data?.reviews || []);
    } catch (error) {
      console.error('Manager: Error loading reviews:', error);
      setError('Не удалось загрузить отзывы для модерации');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadModerationStats = async () => {
    try {
      setError('');
      const response = await managerAPI.getModerationStats();
      setModerationStats(response.data || {
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        rejected_reviews: 0
      });
    } catch (error) {
      console.error('Manager: Error loading stats:', error);
      setModerationStats({
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        rejected_reviews: 0
      });
    }
  };

  const loadFilterStats = async () => {
    try {
      setError('');
      const response = await managerAPI.getFilterStats();
      setFilterStats(response.data || {});
    } catch (error) {
      console.error('Manager: Error loading filter stats:', error);
      setFilterStats({});
      setError('Не удалось загрузить статистику фильтров');
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      setError('');
      await managerAPI.approveReview(reviewId, 'Одобрено менеджером');
      await loadReviews();
      updateStatsAfterAction('approve'); 
      alert('Отзыв успешно одобрен');
    } catch (error) {
      console.error('Manager: Error approving review:', error);
      setError('Ошибка при одобрении отзыва: ' + error.message);
    }
  };

  const handleRejectReview = async (reviewId) => {
    const reason = prompt('Укажите причину отклонения отзыва:');
    if (!reason) return;

    try {
      setError('');
      await managerAPI.rejectReview(reviewId, reason);
      await loadReviews();
      updateStatsAfterAction('reject'); 
      alert('Отзыв успешно отклонен');
    } catch (error) {
      console.error('Manager: Error rejecting review:', error);
      setError('Ошибка при отклонении отзыва: ' + error.message);
    }
  };
  const handleDeleteProduct = async (productId, productName = 'товар') => {
    if (!window.confirm(`Удалить товар "${productName}"?`)) return;

    try {
      setLoading(true);
      setError('');
      await managerAPI.deleteProduct(productId);
      await loadProducts();
      alert(`Товар "${productName}" успешно удален`);
    } catch (error) {
      console.error('Manager: Error deleting product:', error);
      setError('Ошибка удаления товара: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (productId) => {
    setSelectedProduct(productId);
    setUpdateShow(true);
  };

  const handleCreateProduct = () => {
    setCreateShow(true);
  };

  const handleMaterialSelect = (material) => {
    setSelectedMaterials(prev => 
      prev.includes(material) 
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  const handleColorSelect = (color) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handleBrandSelect = (brandId) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCleanupMaterials = async () => {
    if (selectedMaterials.length === 0) {
      alert('Выберите материалы для удаления');
      return;
    }

    if (!window.confirm(`Удалить выбранные материалы из товаров? Будут затронуты: ${selectedMaterials.join(', ')}`)) return;

    try {
      await managerAPI.cleanupMaterials(selectedMaterials);
      setSelectedMaterials([]);
      await loadFilterStats();
      alert('Материалы успешно удалены из товаров');
    } catch (error) {
      console.error('Error cleaning materials:', error);
      alert('Ошибка при удалении материалов');
    }
  };

  const handleCleanupColors = async () => {
    if (selectedColors.length === 0) {
      alert('Выберите цвета для удаления');
      return;
    }

    if (!window.confirm(`Удалить выбранные цвета из товаров? Будут затронуты: ${selectedColors.join(', ')}`)) return;

    try {
      await managerAPI.cleanupColors(selectedColors);
      setSelectedColors([]);
      await loadFilterStats();
      alert('Цвета успешно удалены из товаров');
    } catch (error) {
      console.error('Error cleaning colors:', error);
      alert('Ошибка при удалении цветов');
    }
  };

  const handleCleanupBrands = async () => {
    if (selectedBrands.length === 0) {
      alert('Выберите бренды для удаления');
      return;
    }

    const brandNames = selectedBrands.map(id => 
      filterStats.brands?.find(b => b.id === id)?.name
    ).filter(Boolean).join(', ');

    if (!window.confirm(`Удалить выбранные бренды из товаров? Будут затронуты: ${brandNames}`)) return;

    try {
      setSelectedBrands([]);
      await loadFilterStats();
      alert('Бренды успешно удалены из товаров');
    } catch (error) {
      console.error('Error cleaning brands:', error);
      alert('Ошибка при удалении брендов');
    }
  };

  const handleCleanupCategories = async () => {
    if (selectedCategories.length === 0) {
      alert('Выберите категории для удаления');
      return;
    }

    const categoryNames = selectedCategories.map(id => 
      filterStats.categories?.find(c => c.id === id)?.name
    ).filter(Boolean).join(', ');

    if (!window.confirm(`Удалить выбранные категории из товаров? Будут затронуты: ${categoryNames}`)) return;

    try {
      setSelectedCategories([]);
      await loadFilterStats();
      alert('Категории успешно удалены из товаров');
    } catch (error) {
      console.error('Error cleaning categories:', error);
      alert('Ошибка при удалении категорий');
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Панель менеджера</h2>
          <p className="text-muted">
            Добро пожаловать, {user.user?.name}! 
            Ваша роль: <Badge bg="warning">{user.user?.role}</Badge>
          </p>
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="products" title="🛍️ Управление товарами">
          <ProductsList 
            products={products}
            loading={loading}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onCreate={handleCreateProduct}
          />
        </Tab>
        
        <Tab eventKey="reviews" title={
          <span>
             Модерация отзывов 
            {moderationStats.pending_reviews > 0 && (
              <Badge bg="danger" className="ms-2">{moderationStats.pending_reviews}</Badge>
            )}
          </span>
        }>
          <ReviewsModeration 
            reviews={reviews}
            loading={loading}
            onApprove={handleApproveReview}
            onReject={handleRejectReview}
            stats={moderationStats}
          />
        </Tab>
        
        <Tab eventKey="filters" title=" Управление фильтрами">
          <FiltersManagement 
            stats={filterStats}
            selectedMaterials={selectedMaterials}
            selectedColors={selectedColors}
            selectedBrands={selectedBrands}
            selectedCategories={selectedCategories}
            onMaterialSelect={handleMaterialSelect}
            onColorSelect={handleColorSelect}
            onBrandSelect={handleBrandSelect}
            onCategorySelect={handleCategorySelect}
            onCleanupMaterials={handleCleanupMaterials}
            onCleanupColors={handleCleanupColors}
            onCleanupBrands={handleCleanupBrands}
            onCleanupCategories={handleCleanupCategories}
          />
        </Tab>
      </Tabs>

      {/* Модальные окна для товаров */}
      <CreateProduct 
        show={createShow} 
        setShow={setCreateShow}
        onSuccess={loadProducts}
      />
      
      <UpdateProduct 
        id={selectedProduct}
        show={updateShow}
        setShow={setUpdateShow}
        onSuccess={loadProducts}
      />
    </Container>
  );
};

export default Manager;