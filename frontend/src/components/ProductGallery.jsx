import { useState, useEffect, useRef } from 'react'
import { Row, Col, Image, Modal, Button } from 'react-bootstrap'

const ProductGallery = ({ images, productName }) => {
    const [mainImage, setMainImage] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [modalImageIndex, setModalImageIndex] = useState(0)
    const [touchStart, setTouchStart] = useState(null)
    const modalImageRef = useRef(null)

    if (!images || images.length === 0) {
        return (
            <div className="product-gallery">
                <Image 
                    src="/static/placeholder.jpg" 
                    alt={productName}
                    fluid
                    className="main-image rounded shadow-sm"
                    style={{ 
                        maxHeight: '500px', 
                        objectFit: 'contain',
                        cursor: 'pointer'
                    }}
                    onClick={() => setShowModal(true)}
                />
            </div>
        )
    }

    const handleTouchStart = (e) => {
        setTouchStart(e.touches[0].clientX)
    }

    const handleTouchEnd = (e) => {
        if (!touchStart) return
        
        const touchEnd = e.changedTouches[0].clientX
        const diff = touchStart - touchEnd

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                handleNextImage()
            } else {
                handlePrevImage()
            }
        }
        setTouchStart(null)
    }

    const handleWheel = (e) => {
        if (showModal) {
            e.preventDefault()
            if (e.deltaY > 0) {
                handleNextImage()
            } else {
                handlePrevImage()
            }
        }
    }

    const handleImageClick = (e) => {
        if (!showModal) {
            setModalImageIndex(mainImage)
            setShowModal(true)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const width = rect.width
            
            if (clickX < width / 3) {
                handlePrevImage()
            } else if (clickX > (width * 2) / 3) {
                handleNextImage()
            } 
        }
    }

    const handleNextImage = () => {
        if (showModal) {
            setModalImageIndex(prev => (prev + 1) % images.length)
        } else {
            setMainImage(prev => (prev + 1) % images.length)
        }
    }

    const handlePrevImage = () => {
        if (showModal) {
            setModalImageIndex(prev => (prev - 1 + images.length) % images.length)
        } else {
            setMainImage(prev => (prev - 1 + images.length) % images.length)
        }
    }

    const handleThumbnailClick = (index) => {
        if (showModal) {
            setModalImageIndex(index)
        } else {
            setMainImage(index)
        }
    }

    const handleMainImageClick = () => {
        setModalImageIndex(mainImage)
        setShowModal(true)
    }

    const getImageUrl = (imagePath) => {
        if (!imagePath) return '/static/placeholder.jpg'
        if (imagePath.startsWith('http')) return imagePath
        return `http://localhost:3000${imagePath}`
    }

    const currentImage = showModal ? images[modalImageIndex] : images[mainImage]

    return (
        <div className="product-gallery">
            <Row>
                {/* ГЛАВНОЕ ИЗОБРАЖЕНИЕ */}
                <Col md={10}>
                    <div className="main-image-container position-relative mb-3">
                        <div 
                            className="image-wrapper"
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={handleMainImageClick}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            <Image 
                                src={getImageUrl(images[mainImage])}
                                alt={`${productName} - фото ${mainImage + 1}`}
                                fluid
                                className="main-image rounded shadow-sm"
                                style={{ 
                                    maxHeight: '500px', 
                                    objectFit: 'contain',
                                    backgroundColor: '#f8f9fa',
                                    width: '100%'
                                }}
                                onError={(e) => {
                                    console.error(' Ошибка загрузки изображения:', images[mainImage])
                                    e.target.src = '/static/placeholder.jpg'
                                }}
                            />
                            
                            {/* ИНДИКАТОРЫ ОБЛАСТЕЙ ДЛЯ ЛИСТАНИЯ */}
                            {images.length > 1 && (
                                <>
                                    <div 
                                        className="nav-area nav-area-left"
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '30%',
                                            cursor: 'w-resize',
                                            opacity: 0
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handlePrevImage()
                                        }}
                                    />
                                    <div 
                                        className="nav-area nav-area-right"
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '30%',
                                            cursor: 'e-resize',
                                            opacity: 0
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleNextImage()
                                        }}
                                    />
                                </>
                            )}

                            {/* СЧЕТЧИК ИЗОБРАЖЕНИЙ */}
                            {images.length > 1 && (
                                <div className="position-absolute bottom-0 end-0 m-2">
                                    <span className="badge bg-dark bg-opacity-75">
                                        {mainImage + 1} / {images.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Col>
                
                {/* МИНИАТЮРЫ (ВЕРТИКАЛЬНЫЕ) */}
                <Col md={2}>
                    <div className="thumbnails-vertical">
                        {images.map((image, index) => (
                            <div 
                                key={index}
                                className={`thumbnail mb-2 ${index === mainImage ? 'active' : ''}`}
                                onClick={() => handleThumbnailClick(index)}
                                style={{ cursor: 'pointer' }}
                            >
                                <Image 
                                    src={getImageUrl(image)}
                                    alt={`${productName} - миниатюра ${index + 1}`}
                                    fluid
                                    className="rounded border"
                                    style={{ 
                                        height: '80px', 
                                        width: '80px', 
                                        objectFit: 'cover',
                                        border: index === mainImage ? '3px solid #007bff' : '2px solid #dee2e6',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onError={(e) => {
                                        e.target.src = '/static/placeholder.jpg'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>

            {/* ГОРИЗОНТАЛЬНЫЕ МИНИАТЮРЫ ДЛЯ МОБИЛЬНЫХ */}
            <div className="thumbnails-horizontal d-md-none mt-3">
                <div className="d-flex overflow-auto pb-2">
                    {images.map((image, index) => (
                        <div 
                            key={index}
                            className={`thumbnail me-2 ${index === mainImage ? 'active' : ''}`}
                            onClick={() => handleThumbnailClick(index)}
                            style={{ 
                                cursor: 'pointer', 
                                flexShrink: 0 
                            }}
                        >
                            <Image 
                                src={getImageUrl(image)}
                                alt={`${productName} - миниатюра ${index + 1}`}
                                style={{ 
                                    height: '60px', 
                                    width: '60px', 
                                    objectFit: 'cover',
                                    border: index === mainImage ? '3px solid #007bff' : '2px solid #dee2e6',
                                    borderRadius: '8px'
                                }}
                                className="rounded"
                                onError={(e) => {
                                    e.target.src = '/static/placeholder.jpg'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО ДЛЯ УВЕЛИЧЕННОГО ПРОСМОТРА */}
            <Modal 
                show={showModal} 
                onHide={() => {
                    setShowModal(false)
                    setZoomMode(false)
                }}
                size="xl"
                centered
                fullscreen="md-down"
                onWheel={handleWheel}
            >
                <Modal.Header closeButton className="border-0 bg-dark bg-opacity-10">
                    <Modal.Title className="small text-dark">
                        {productName} - {modalImageIndex + 1} / {images.length}
                        {zoomMode && <span className="ms-2 text-warning">🔍 Увеличено</span>}
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body 
                    className="p-0 position-relative bg-dark"
                    style={{ minHeight: '60vh' }}
                    onClick={handleImageClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div 
                        className="modal-image-container d-flex align-items-center justify-content-center w-100 h-100"
                        style={{ 
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                    >
                        <Image
                            ref={modalImageRef}
                            src={getImageUrl(currentImage)}
                            alt={`${productName} - фото ${modalImageIndex + 1}`}
                            style={{
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onError={(e) => {
                                e.target.src = '/static/placeholder.jpg'
                            }}
                        />

                        {/* ИНДИКАТОРЫ ОБЛАСТЕЙ ДЛЯ ЛИСТАНИЯ В МОДАЛЬНОМ ОКНЕ */}
                        {images.length > 1 && (
                            <>
                                <div 
                                    className="nav-area-modal nav-area-left"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '30%',
                                        cursor: 'w-resize',
                                        background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        paddingLeft: '20px',
                                        opacity: 0.7,
                                        transition: 'opacity 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                                    onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                                >
                                    <span style={{ color: 'white', fontSize: '2rem' }}>‹</span>
                                </div>
                                <div 
                                    className="nav-area-modal nav-area-right"
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: '30%',
                                        cursor: 'e-resize',
                                        background: 'linear-gradient(270deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        paddingRight: '20px',
                                        opacity: 0.7,
                                        transition: 'opacity 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                                    onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                                >
                                    <span style={{ color: 'white', fontSize: '2rem' }}>›</span>
                                </div>
                            </>
                        )}
                    </div>
                </Modal.Body>

                <Modal.Footer className="border-0 justify-content-between bg-dark bg-opacity-10">
                    <div className="d-flex gap-2">
                        {images.length > 1 && (
                            <>
                                <Button
                                    variant="outline-dark"
                                    onClick={handlePrevImage}
                                    size="sm"
                                >
                                    ‹ Назад
                                </Button>
                                <Button
                                    variant="outline-dark"
                                    onClick={handleNextImage}
                                    size="sm"
                                >
                                    Вперед ›
                                </Button>
                            </>
                        )}
                    </div>

                    {/* МИНИАТЮРЫ В МОДАЛЬНОМ ОКНЕ */}
                    {images.length > 1 && (
                        <div className="d-flex gap-2 flex-wrap justify-content-center">
                            {images.map((image, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail-modal ${index === modalImageIndex ? 'active' : ''}`}
                                    onClick={() => handleThumbnailClick(index)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Image
                                        src={getImageUrl(image)}
                                        alt={`${productName} - миниатюра ${index + 1}`}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            objectFit: 'cover',
                                            border: index === modalImageIndex ? '3px solid #007bff' : '2px solid #6c757d',
                                            borderRadius: '4px'
                                        }}
                                        className="rounded"
                                        onError={(e) => {
                                            e.target.src = '/static/placeholder.jpg'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default ProductGallery