/**
 * 
 * @param {string} imagePath 
 * @returns {string} 
 */

export const getImageUrl = (imagePath) => {
    if (!imagePath) {
        return getPlaceholderImage();
    }
    
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    
    if (cleanPath.startsWith('uploads/')) {
        const filename = cleanPath.replace('uploads/', '');
        return `http://localhost:3000/images/${filename}`;
    }
    
    return `http://localhost:3000/${cleanPath}`;
};

/**
 * 
 * @returns {string} 
 */
export const getPlaceholderImage = () => {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDE4MFYxODBIMTIwVjEyMFoiIGZpbGw9IiNFRkVGRUYiLz4KPHBhdGggZD0iTTIyMCAxMjBIMjgwVjE4MEgyMjBWMTIwWiIgZmlsbD0iI0VGRUZFRSIvPgo8cGF0aCBkPSJNMTIwIDIwMEgxODBWMjYwSDEyMFYyMDBaIiBmaWxsPSIjRUZFRkVFIi8+CjxwYXRoIGQ9Ik0yMjAgMjAwSDI4MFYyNjBIMjIwVjIwMFoiIGZpbGw9IiNFRkVGRUUiLz4KPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=";
};

/**
 * 
 * @param {Event} e 
 */
export const handleImageError = (e) => {
    console.log(' Image load error, using placeholder');
    e.target.src = getPlaceholderImage();
};

/**
 * 
 * @param {string} imagePath 
 * @returns {string} 
 */
export const getProductImage = (imagePath) => {
    return getImageUrl(imagePath);
};

/**
 * 
 * @param {string} imagePath 
 * @returns {string} 
 */
export const getCategoryImage = (imagePath) => {
    return getImageUrl(imagePath);
};

export default {
    getImageUrl,
    getPlaceholderImage,
    handleImageError,
    getProductImage,
    getCategoryImage
};