CREATE DATABASE IF NOT EXISTS russian_home;
USE russian_home;


CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('user', 'manager', 'admin') DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(100),
    email_verification_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    brand_id INT,
    material VARCHAR(100),
    color VARCHAR(100),
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    discount_percent INT DEFAULT 0,
    discount_start DATETIME NULL,
    discount_end DATETIME NULL,
    status ENUM('new', 'hit', 'sale', 'default', 'out_of_stock') DEFAULT 'default',
    auto_stock_status BOOLEAN DEFAULT TRUE,
    images JSON,
    specifications JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    shipping_method VARCHAR(100),
    shipping_address TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS review_moderation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    moderator_id INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    moderation_comment TEXT,
    moderated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percent);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


INSERT IGNORE INTO users (email, password, name, role, email_verified) VALUES 
('admin@russianhome.ru', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Администратор', 'admin', TRUE);

INSERT IGNORE INTO users (email, password, name, role, email_verified) VALUES 
('manager@russianhome.ru', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Менеджер Тестовый', 'manager', TRUE);

INSERT IGNORE INTO users (email, password, name, role, email_verified) VALUES 
('user@russianhome.ru', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Пользователь Тестовый', 'user', TRUE);

INSERT IGNORE INTO categories (name, description) VALUES 
('Раковины', 'Стильные раковины для ванной комнаты и кухни'),
('Унитазы', 'Современные унитазы и инсталляции'),
('Смесители', 'Качественные смесители для воды'),
('Ванны', 'Акриловые, чугунные и стальные ванны'),
('Душевые кабины', 'Душевые уголки и кабины');

INSERT IGNORE INTO brands (name, description) VALUES 
('Grohe', 'Немецкое качество и дизайн'),
('Hansgrohe', 'Инновации в мире сантехники'),
('Roca', 'Испанский стиль и надежность'),
('Cersanit', 'Польское качество по доступным ценам'),
('Jacob Delafon', 'Французская элегантность');

INSERT IGNORE INTO products (name, description, price, category_id, brand_id, stock_quantity, material, color) VALUES 
('Раковина керамическая белая', 'Стильная керамическая раковина для ванной комнаты', 4500.00, 1, 1, 10, 'Керамика', 'Белый'),
('Унитаз подвесной с инсталляцией', 'Современный подвесной унитаз с системой скрытого монтажа', 12500.00, 2, 2, 5, 'Фаянс', 'Белый'),
('Смеситель для раковины хром', 'Элегантный смеситель с аэратором для экономии воды', 3200.00, 3, 3, 15, 'Латунь', 'Хром'),
('Акриловая ванна 170см', 'Комфортная акриловая ванна с антискользящим покрытием', 22000.00, 4, 4, 3, 'Акрил', 'Белый'),
('Душевая кабина угловая', 'Стеклянная душевая кабина с гидромассажем', 18500.00, 5, 5, 2, 'Стекло', 'Прозрачный');

INSERT IGNORE INTO reviews (product_id, user_id, rating, comment, status) VALUES 
(1, 3, 5, 'Отличная раковина, качество на высоте!', 'approved'),
(1, 1, 4, 'Хорошее качество, но дороговато', 'pending'),
(2, 3, 3, 'Нормальный унитаз, но сложная установка', 'pending'),
(3, 2, 5, 'Прекрасный смеситель, всем рекомендую!', 'approved'),
(4, 3, 2, 'Ванна не очень, появились царапины быстро', 'rejected');

INSERT IGNORE INTO review_moderation (review_id, moderator_id, status, moderation_comment, moderated_at) VALUES 
(1, 2, 'approved', 'Отзыв соответствует правилам', NOW()),
(4, 1, 'approved', 'Позитивный отзыв, одобрено', NOW()),
(5, 2, 'rejected', 'Недостаточно информации для подтверждения', NOW());