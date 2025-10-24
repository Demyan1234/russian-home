const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const compression = require('compression');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;

const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user'
};

const PERMISSIONS = {
    ADMIN: [
        'users.manage', 'roles.manage', 'products.manage',
        'categories.manage', 'brands.manage', 'orders.manage',
        'reviews.moderate', 'filters.manage', 'stats.view',
        'settings.manage', 'email_templates.manage'
    ],
    
    MANAGER: [
        'products.create', 'products.update', 'products.delete',
        'reviews.moderate', 'filters.manage', 'orders.view',
        'stats.view', 'categories.view', 'brands.view'
    ],
    
    USER: [
        'products.view', 'orders.create', 'reviews.create',
        'profile.view', 'basket.manage', 'favorites.manage'
    ]
};

process.on('unhandledRejection', (reason, promise) => {
    console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error(' Uncaught Exception:', error);
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(compression());

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 100, 
    message: {
        error: 'Слишком много запросов, попробуйте позже'
    },
    skipSuccessfulRequests: true 
});

app.use('/api/', limiter);

const cache = new Map();

const CACHE_DURATION = {
    SHORT: 1 * 60 * 1000, 
    MEDIUM: 5 * 60 * 1000, 
    LONG: 30 * 60 * 1000 
};

const withCache = (key, fetchFunction, duration = CACHE_DURATION.MEDIUM) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
        return Promise.resolve(cached.data);
    }
    
    return fetchFunction().then(data => {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
        return data;
    });
};

app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://localhost:5174',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:3000'
        ];
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(' CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400
}));

app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

app.options('*', cors());

app.use(express.json());

app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    },
    maxAge: '1d'
}));

app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    console.log('Headers:', {
        authorization: req.headers.authorization ? 'PRESENT' : 'MISSING',
        origin: req.headers.origin
    });
    next();
});

app.use('/static', express.static('static', {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
    maxAge: '1d'
}));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('static')) fs.mkdirSync('static');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const safeName = originalName.replace(/[^a-zA-Z0-9.\-]/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
});

const getUserPermissions = (role) => {
    return PERMISSIONS[role.toUpperCase()] || PERMISSIONS.USER;
};

const checkPermission = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const userPermissions = getUserPermissions(req.user.role);
        
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({ 
                success: false,
                error: 'Недостаточно прав для выполнения этого действия' 
            });
        }

        next();
    };
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Неверный токен',
                details: err.message 
            });
        }
        
        if (user.role === 'user' && !user.email_verified) {
            req.user = { ...user, email_verified: false };
        } else {
            req.user = user;
        }
        
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Недостаточно прав. Требуется роль администратора' 
        });
    }
    
    next();
};

const requireManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    if (req.user.role !== ROLES.MANAGER && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ 
            success: false,
            error: 'Недостаточно прав. Требуется роль менеджера или администратора' 
        });
    }
    
    next();
};

const requireManagerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Недостаточно прав. Требуется роль менеджера или администратора' 
        });
    }
    
    next();
};



const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCodeEmail = async (user, verificationCode) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('SMTP не настроен, пропускаем отправку письма с кодом');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { padding: 30px; background: #f8f9fa; }
                    .code { font-size: 2.5em; font-weight: bold; text-align: center; color: #28a745; background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px dashed #28a745; }
                    .footer { background: #e9ecef; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Код подтверждения Russian Home</h1>
                    </div>
                    
                    <div class="content">
                        <p>Уважаемый(ая) <strong>${user.name}</strong>,</p>
                        <p>Для завершения регистрации введите следующий код подтверждения:</p>
                        
                        <div class="code">${verificationCode}</div>
                        
                        <p><strong>Срок действия кода:</strong> 10 минут</p>
                        <p>Если вы не регистрировались в нашем магазине, просто проигнорируйте это письмо.</p>
                    </div>
                    
                    <div class="footer">
                        <p>С уважением,<br><strong>Команда Russian Home</strong></p>
                        <p>© 2024 Russian Home. Все права защищены.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@russianhome.ru',
            to: user.email,
            subject: 'Код подтверждения - Russian Home',
            html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Verification code sent to ${user.email}`);
        
    } catch (error) {
        console.error('Error sending verification code email:', error);
        throw error;
    }
};

app.post('/api/auth/verify-code', async (req, res) => {
    let connection;
    try {
        const { email, code } = req.body;
        
        console.log('Verify code request:', { email, code });
        
        if (!email || !code) {
            return res.status(400).json({ 
                success: false,
                error: 'Email и код обязательны' 
            });
        }

        connection = await pool.getConnection();
        
        const [users] = await connection.execute(
            'SELECT id, email, name, verification_code, verification_code_expires, email_verified FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
        const user = users[0];
        console.log('User found:', { 
            id: user.id, 
            hasCode: !!user.verification_code,
            codeExpires: user.verification_code_expires,
            currentTime: new Date(),
            isExpired: new Date() > user.verification_code_expires
        });
        
        // Проверяем срок действия кода
        if (!user.verification_code_expires || new Date() > user.verification_code_expires) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Срок действия кода истек. Запросите новый код.' 
            });
        }
        
        // Проверяем код
        if (user.verification_code !== code) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Неверный код подтверждения' 
            });
        }
        
        // Подтверждаем email и очищаем код
        const userId = parseInt(user.id);
        console.log('Updating user verification status for ID:', userId);
        
        await connection.execute(
            'UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE id = ?',
            [userId]
        );
        
        // ИСПРАВЛЕНИЕ: Правильно создаем JWT токен
        const token = jwt.sign(
            { 
                id: userId, 
                email: user.email, 
                role: 'user',
                email_verified: true
            },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        console.log('JWT token created successfully');

        // Получаем обновленные данные пользователя
        const [updatedUsers] = await connection.execute(
            'SELECT id, email, name, phone, role, email_verified, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        connection.release();
        
        console.log('Email verification successful for:', email);
        console.log('Sending response with token and user data');
        
        res.json({ 
            success: true,
            message: 'Email успешно подтвержден',
            data: {
                token: token, // Убедимся что token определен
                user: updatedUsers[0]
            }
        });
        
    } catch (error) {
        console.error('Email verification error:', error);
        console.error('Error stack:', error.stack);
        if (connection) connection.release();
        res.status(500).json({ 
            success: false,
            error: 'Ошибка подтверждения email',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/debug/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const connection = await pool.getConnection();
        
        const [users] = await connection.execute(
            'SELECT id, email, email_verified, verification_code, verification_code_expires FROM users WHERE email = ?',
            [email]
        );
        
        connection.release();
        
        if (users.length === 0) {
            return res.json({ error: 'User not found' });
        }
        
        res.json({
            user: users[0],
            currentTime: new Date(),
            codeExpired: new Date() > users[0].verification_code_expires
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false,
                error: 'Email обязателен' 
            });
        }

        const connection = await pool.getConnection();
        
        const [users] = await connection.execute(
            'SELECT id, email, name, email_verified FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
        const user = users[0];
        
        if (user.email_verified) {
            connection.release();
            return res.status(400).json({ 
                success: false,
                error: 'Email уже подтвержден' 
            });
        }
        
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
        
        await connection.execute(
            'UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?',
            [verificationCode, verificationCodeExpires, user.id]
        );
        
        connection.release();

        try {
            await sendVerificationCodeEmail(user, verificationCode);
            res.json({ 
                success: true,
                message: 'Новый код подтверждения отправлен на ваш email'
            });
        } catch (emailError) {
            console.error('Failed to send verification code:', emailError);
            res.status(500).json({ 
                success: false,
                error: 'Ошибка отправки кода' 
            });
        }
        
    } catch (error) {
        console.error('Resend code error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера' 
        });
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        console.log('Admin fetching users');
        
        connection = await getConnection();
        
        const [users] = await connection.execute(`
            SELECT 
                id, email, name, phone, role, email_verified,
                DATE_FORMAT(created_at, '%d.%m.%Y %H:%i') as created_at
            FROM users 
            ORDER BY created_at DESC
        `);
        
        connection.release();
        
        res.json({
            success: true,
            data: users
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения пользователей' 
        });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['user', 'manager', 'admin'].includes(role)) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверная роль. Допустимые: user, manager, admin' 
            });
        }
        
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ 
                success: false,
                error: 'Нельзя изменить свою роль' 
            });
        }
        
        connection = await getConnection();
        
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
        await connection.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, id]
        );
        
        res.json({
            success: true,
            message: `Роль пользователя изменена на "${role}"`
        });
        
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка изменения роли' 
        });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ 
                success: false,
                error: 'Нельзя удалить свой аккаунт' 
            });
        }
        
        connection = await getConnection();
        
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }
        
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Пользователь удален'
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка удаления пользователя' 
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/user/permissions', authenticateToken, async (req, res) => {
    try {
        const permissions = getUserPermissions(req.user.role);
        
        res.json({
            success: true,
            data: {
                permissions: permissions,
                role: req.user.role,
                userId: req.user.id
            }
        });
        
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения прав' 
        });
    }
});

const sendVerificationEmail = async (user, verificationToken) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('SMTP не настроен, пропускаем отправку письма подтверждения');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
        
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { padding: 30px; background: #f8f9fa; }
                    .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #e9ecef; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Добро пожаловать в Russian Home!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Уважаемый(ая) <strong>${user.name}</strong>,</p>
                        <p>Благодарим вас за регистрацию в нашем магазине.</p>
                        <p>Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес:</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Подтвердить Email</a>
                        </div>
                        
                        <p>Если кнопка не работает, скопируйте и вставьте в браузер следующую ссылку:</p>
                        <p><small>${verificationUrl}</small></p>
                        
                        <p><strong>Срок действия ссылки:</strong> 24 часа</p>
                        
                        <p>Если вы не регистрировались в нашем магазине, просто проигнорируйте это письмо.</p>
                    </div>
                    
                    <div class="footer">
                        <p>С уважением,<br><strong>Команда Russian Home</strong></p>
                        <p>© 2024 Russian Home. Все права защищены.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@russianhome.ru',
            to: user.email,
            subject: 'Подтверждение email - Russian Home',
            html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${user.email}`);
        
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

const checkSMTPConfig = () => {
    const required = ['SMTP_USER', 'SMTP_PASS'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.log('  SMTP не настроен. Emails не будут отправляться.');
        console.log(' Отсутствуют:', missing.join(', '));
        return false;
    }
    
    console.log(' SMTP настроен корректно');
    return true;
};

checkSMTPConfig();

const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
    if (name === 'warning' && data?.name === 'DeprecationWarning' && data?.message?.includes('util._extend')) {
        return false; 
    }
    return originalEmit.apply(process, arguments);
};

const sendOrderEmail = async (orderData, userData, emailType = 'confirmation') => {
    let transporter;
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log(' Email: SMTP не настроен, пропускаем отправку');
            return;
        }

        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        let subject, html;

        if (emailType === 'confirmation') {
            subject = `Подтверждение заказа #${orderData.id} - Russian Home`;
            html = generateOrderConfirmationEmail(orderData, userData);
        } else if (emailType === 'paid') {
            subject = `Заказ #${orderData.id} оплачен - Russian Home`;
            html = generateOrderPaidEmail(orderData, userData);
        } else if (emailType === 'shipped') {
            subject = `Заказ #${orderData.id} отправлен - Russian Home`;
            html = generateOrderShippedEmail(orderData, userData);
        }

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@russianhome.ru',
            to: userData.email,
            subject: subject,
            html: html
        };

        await transporter.sendMail(mailOptions);
        console.log(` Email отправлен: ${emailType} to ${userData.email}`);
        
    } catch (error) {
        console.error(' Ошибка отправки email:', error);
    } finally {
        if (transporter) {
            transporter.close();
        }
    }
};

const generateOrderConfirmationEmail = (order, user) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .order-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .footer { background: #e9ecef; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Заказ создан успешно!</h1>
                <p>Спасибо за ваш заказ в Russian Home</p>
            </div>
            
            <div class="content">
                <p>Уважаемый(ая) <strong>${user.name}</strong>,</p>
                <p>Ваш заказ <strong>#${order.id}</strong> успешно создан и ожидает обработки.</p>
                
                <div class="order-details">
                    <h3>Детали заказа</h3>
                    <p><strong>Номер заказа:</strong> #${order.id}</p>
                    <p><strong>Дата создания:</strong> ${new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                    <p><strong>Сумма заказа:</strong> ${order.total_amount} руб.</p>
                    <p><strong>Способ доставки:</strong> ${order.shipping_method === 'cdek' ? 'СДЭК' : 'Почта России'}</p>
                    <p><strong>Адрес доставки:</strong> ${order.shipping_address}</p>
                    
                    <h4>Товары в заказе:</h4>
                    ${order.items ? order.items.map(item => `
                        <div class="product-item">
                            <strong>${item.name}</strong><br>
                            <small>Количество: ${item.quantity} × ${item.price} руб. = ${item.quantity * item.price} руб.</small>
                        </div>
                    `).join('') : ''}
                    
                    <div class="total">
                        Итого: ${order.total_amount} руб.
                    </div>
                </div>
                
                <p><strong>Следующие шаги:</strong></p>
                <ul>
                    <li>Ожидайте подтверждения заказа менеджером</li>
                    <li>Произведите оплату согласно выбранному способу</li>
                    <li>Отслеживайте статус заказа в личном кабинете</li>
                </ul>
                
                <p>Если у вас есть вопросы, свяжитесь с нами:</p>
                <p> Телефон: +7 (XXX) XXX-XX-XX<br>
                    Email: support@russianhome.ru</p>
            </div>
            
            <div class="footer">
                <p>С уважением,<br><strong>Команда Russian Home</strong></p>
                <p>© 2024 Russian Home. Все права защищены.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

process.on('unhandledRejection', (reason, promise) => {
    console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error(' Uncaught Exception:', error);
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());

app.use(cors({
    origin: function (origin, callback) {
        
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://localhost:5174',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:3000'
        ];
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(' CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400
}));

app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

app.options('*', cors());

app.use(express.json());

app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    },
    maxAge: '1d'
}));

app.use('/static', express.static('static', {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
    maxAge: '1d'
}));

app.use('/images', (req, res, next) => {
    console.log(' Image request:', req.method, req.url);
    next();
});

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n [${timestamp}] ${req.method} ${req.originalUrl}`);
    console.log(' Origin:', req.headers.origin);
    console.log(' Auth Header:', req.headers['authorization'] ? 'PRESENT' : 'MISSING');
    console.log(' Content-Type:', req.headers['content-type']);
    console.log(' User Agent:', req.headers['user-agent']);
    
    if (req.method !== 'GET' && !req.is('multipart/form-data')) {
        console.log(' Request Body:', JSON.stringify(req.body, null, 2));
    }
    
    const originalSend = res.send;
    res.send = function(data) {
        console.log(` Response Status: ${res.statusCode}`);
        if (res.statusCode >= 400) {
            console.log(' Error Response:', data);
        }
        originalSend.apply(this, arguments);
    };
    
    next();
});

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'russian_home',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 20, 
    acquireTimeout: 60000, 
    timeout: 60000, 
    reconnect: true 
});

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION.LONG) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000); 

async function getConnection() {
    return await pool.getConnection();
}

const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    if (!req.user.email_verified) {
        return res.status(403).json({ 
            error: 'Требуется подтверждение email для этого действия',
            requiresEmailVerification: true 
        });
    }
    
    next();
};

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        console.log(' Admin stats request from:', req.user.email);
        connection = await getConnection();
        
        const results = await Promise.allSettled([
            connection.execute('SELECT COUNT(*) as count FROM products WHERE is_active = TRUE'),
            connection.execute('SELECT COUNT(*) as count FROM orders'),
            connection.execute('SELECT COUNT(*) as count FROM users'),
            
            connection.execute(`
                SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
                FROM orders 
                WHERE payment_status = 'paid'
            `),
            
            connection.execute(`
                SELECT COUNT(*) as today_orders 
                FROM orders 
                WHERE DATE(created_at) = CURDATE()
            `),
            
            connection.execute(`
                SELECT COALESCE(SUM(total_amount), 0) as monthly_revenue 
                FROM orders 
                WHERE payment_status = 'paid' 
                AND MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE())
            `),
            
            connection.execute(`
                SELECT o.*, u.name as customer_name 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                ORDER BY o.created_at DESC 
                LIMIT 5
            `),
            
            connection.execute(`
                SELECT id, name, stock_quantity, price 
                FROM products 
                WHERE stock_quantity < 5 AND is_active = TRUE 
                ORDER BY stock_quantity ASC 
                LIMIT 10
            `),
            
            connection.execute(`
                SELECT p.id, p.name, 
                COALESCE(SUM(oi.quantity), 0) as sales_count,
                COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
                WHERE p.is_active = TRUE
                GROUP BY p.id, p.name
                ORDER BY sales_count DESC
                LIMIT 5
            `)
        ]);

        const [
            productsCount, ordersCount, usersCount, revenueResult, 
            todayOrdersResult, monthlyRevenueResult, recentOrders, 
            lowStockProducts, popularProducts
        ] = results.map(result => 
            result.status === 'fulfilled' ? result.value : [[{ count: 0, total_revenue: 0, today_orders: 0, monthly_revenue: 0 }]]
        );

        const stats = {
            totalProducts: productsCount[0][0]?.count || 0,
            totalOrders: ordersCount[0][0]?.count || 0,
            totalUsers: usersCount[0][0]?.count || 0,
            totalRevenue: parseFloat(revenueResult[0][0]?.total_revenue) || 0,
            todayOrders: todayOrdersResult[0][0]?.today_orders || 0,
            monthlyRevenue: parseFloat(monthlyRevenueResult[0][0]?.monthly_revenue) || 0,
            recentOrders: (recentOrders[0] || []).map(order => ({
                ...order,
                created_at: order.created_at ? order.created_at.toISOString() : new Date().toISOString()
            })),
            lowStockProducts: lowStockProducts[0] || [],
            popularProducts: popularProducts[0] || []
        };

        console.log(' Admin stats generated successfully');

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error(' Admin Stats Error:', error);
        
        const fallbackStats = {
            totalProducts: 0,
            totalOrders: 0,
            totalUsers: 0,
            totalRevenue: 0,
            todayOrders: 0,
            monthlyRevenue: 0,
            recentOrders: [],
            lowStockProducts: [],
            popularProducts: []
        };
        
        res.json({
            success: true,
            data: fallbackStats
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/admin/brands', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await getConnection();
        const [brands] = await connection.execute(`
            SELECT b.*, 
            COUNT(p.id) as products_count
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = TRUE
            GROUP BY b.id
            ORDER BY b.name ASC
        `);

        res.json({
            success: true,
            data: brands
        });

    } catch (error) {
        console.error('Admin Brands Error:', error);
        res.status(500).json({ error: 'Ошибка получения брендов' });
    }
});

app.get('/api/manager/reviews/moderation/stats', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        console.log('Manager fetching moderation stats');
        
        connection = await getConnection();
        
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reviews,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reviews,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reviews
            FROM reviews
        `);
        
        console.log('Manager moderation stats:', stats[0]);
        
        res.json({
            success: true,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('Manager get moderation stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения статистики модерации'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/manager/reviews/moderation', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { status = 'pending' } = req.query;
        
        console.log('Manager fetching reviews for moderation with status:', status);
        
        connection = await getConnection();
        
        const query = `
            SELECT 
                r.*,
                u.name as user_name,
                u.email as user_email,
                p.name as product_name,
                rm.moderated_at,
                rm.moderation_comment
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            LEFT JOIN review_moderation rm ON r.id = rm.review_id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
        `;
        
        const [reviews] = await connection.execute(query, [status]);
        
        console.log(`Manager found ${reviews.length} reviews for moderation`);
        
        res.json({
            success: true,
            data: {
                reviews: reviews
            }
        });
        
    } catch (error) {
        console.error('Manager get reviews for moderation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения отзывов для модерации'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/manager/products', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    console.log(' МЕНЕДЖЕР API Products запрос от:', req.user?.email);
    
    try {
        const connection = await getConnection();
        
        const [products] = await connection.execute(`
            SELECT p.*, c.name as category_name, b.name as brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            ORDER BY p.created_at DESC
        `);
        
        console.log(` Менеджер: Найдено товаров: ${products.length}`);
        
        const formattedProducts = products.map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            finalPrice: product.discount_percent > 0 ? 
                Math.round(product.price * (1 - product.discount_percent / 100)) : product.price
        }));
        
        connection.release();
        
        res.json({
            success: true,
            data: formattedProducts
        });
        
    } catch (error) {
        console.error(' Manager Products Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения товаров',
            details: error.message
        });
    }
});

app.get('/api/admin/filters/stats', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        console.log('Fetching filter stats for manager/admin');
        connection = await getConnection();
        
        const [materialStats] = await connection.execute(`
            SELECT material, COUNT(*) as product_count 
            FROM products 
            WHERE material IS NOT NULL AND material != '' AND is_active = TRUE
            GROUP BY material 
            ORDER BY product_count DESC
        `);
        
        const [colorStats] = await connection.execute(`
            SELECT color, COUNT(*) as product_count 
            FROM products 
            WHERE color IS NOT NULL AND color != '' AND is_active = TRUE
            GROUP BY color 
            ORDER BY product_count DESC
        `);
        
        const [brandStats] = await connection.execute(`
            SELECT b.id, b.name, COUNT(p.id) as product_count 
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = TRUE
            GROUP BY b.id, b.name
            ORDER BY product_count DESC
        `);
        
        const [categoryStats] = await connection.execute(`
            SELECT c.id, c.name, COUNT(p.id) as product_count 
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            GROUP BY c.id, c.name
            ORDER BY product_count DESC
        `);
        
        connection.release();
        
        res.json({
            success: true,
            data: {
                materials: materialStats,
                colors: colorStats,
                brands: brandStats,
                categories: categoryStats
            }
        });
        
    } catch (error) {
        console.error('Filter stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения статистики фильтров'
        });
    }
});

app.get('/api/admin/filters/categories-stats', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const [categoryStats] = await connection.execute(`
            SELECT c.id, c.name, c.description, COUNT(p.id) as product_count 
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            GROUP BY c.id, c.name, c.description
            ORDER BY product_count DESC
        `);
        
        connection.release();
        
        res.json({
            success: true,
            data: categoryStats
        });
        
    } catch (error) {
        console.error('Category stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения статистики категорий'
        });
    }
});

app.post('/api/admin/filters/materials/cleanup', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { materialsToRemove } = req.body;
        
        if (!materialsToRemove || !Array.isArray(materialsToRemove)) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверный формат данных' 
            });
        }

        connection = await getConnection();
        
        let updatedCount = 0;
        for (const material of materialsToRemove) {
            const [result] = await connection.execute(
                'UPDATE products SET material = NULL WHERE material = ? AND is_active = TRUE',
                [material]
            );
            updatedCount += result.affectedRows;
        }
        
        connection.release();
        
        res.json({
            success: true,
            message: `Удалено ${materialsToRemove.length} материалов, обновлено ${updatedCount} товаров`,
            updatedCount
        });
        
    } catch (error) {
        console.error('Materials cleanup error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка очистки материалов' 
        });
    }
});

app.post('/api/admin/filters/colors/cleanup', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { colorsToRemove } = req.body;
        
        if (!colorsToRemove || !Array.isArray(colorsToRemove)) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверный формат данных' 
            });
        }

        connection = await getConnection();
        
        let updatedCount = 0;
        for (const color of colorsToRemove) {
            const [result] = await connection.execute(
                'UPDATE products SET color = NULL WHERE color = ? AND is_active = TRUE',
                [color]
            );
            updatedCount += result.affectedRows;
        }
        
        connection.release();
        
        res.json({
            success: true,
            message: `Удалено ${colorsToRemove.length} цветов, обновлено ${updatedCount} товаров`,
            updatedCount
        });
        
    } catch (error) {
        console.error('Colors cleanup error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка очистки цветов' 
        });
    }
});

app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT id, email, name, phone, role, email_verified, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        connection.release();
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = users[0];
        
        res.json({
            success: true,
            data: user
        });
        
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({ error: 'Ошибка получения информации о пользователе' });
    }
});

app.post('/api/user/check-permission', authenticateToken, async (req, res) => {
    try {
        const { permission } = req.body;
        
        if (!permission) {
            return res.status(400).json({ 
                success: false,
                error: 'Укажите право для проверки' 
            });
        }
        
        const userPermissions = getUserPermissions(req.user.role);
        const hasPermission = userPermissions.includes(permission);
        
        res.json({
            success: true,
            data: {
                hasPermission: hasPermission,
                permission: permission,
                role: req.user.role
            }
        });
        
    } catch (error) {
        console.error('Check permission error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка проверки прав' 
        });
    }
});

app.get('/api/admin/roles', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const roles = [
            {
                value: 'user',
                label: 'Пользователь',
                permissions: PERMISSIONS.USER,
                description: 'Обычный пользователь с базовыми правами'
            },
            {
                value: 'manager', 
                label: 'Менеджер',
                permissions: PERMISSIONS.MANAGER,
                description: 'Менеджер с правами на управление товарами и модерацию'
            },
            {
                value: 'admin',
                label: 'Администратор', 
                permissions: PERMISSIONS.ADMIN,
                description: 'Полный доступ ко всем функциям системы'
            }
        ];
        
        res.json({
            success: true,
            data: roles
        });
        
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения списка ролей' 
        });
    }
});

console.log(' Система ролей и прав доступа инициализирована');

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT id, email, name, phone, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        connection.release();
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/basket', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        const [items] = await connection.execute(
            `SELECT c.*, p.name, p.price, p.images, p.stock_quantity, p.discount_percent
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`,
            [req.user.id]
        );
        
        const formattedItems = items.map(item => ({
            ...item,
            images: item.images ? JSON.parse(item.images) : [],
            finalPrice: item.discount_percent > 0 ? 
                Math.round(item.price * (1 - item.discount_percent / 100)) : item.price
        }));
        
        const totalAmount = formattedItems.reduce((sum, item) => 
            sum + (item.finalPrice * item.quantity), 0
        );
        
        res.json({
            success: true,
            data: {
                items: formattedItems,
                summary: {
                    totalAmount,
                    totalItems: formattedItems.length
                }
            }
        });
    } catch (error) {
        console.error('Ошибка получения корзины:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        const [favorites] = await connection.execute(`
            SELECT f.*, p.name, p.price, p.images, p.discount_percent, p.stock_quantity,
                c.name as category_name, b.name as brand_name
            FROM favorites f
            JOIN products p ON f.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE f.user_id = ? AND p.is_active = TRUE
            ORDER BY f.created_at DESC
        `, [req.user.id]);
        
        connection.release();
        
        const formattedFavorites = favorites.map(item => ({
            ...item,
            images: item.images ? JSON.parse(item.images) : [],
            finalPrice: item.discount_percent > 0 ? 
                Math.round(item.price * (1 - item.discount_percent / 100)) : item.price
        }));
        
        res.json({
            success: true,
            data: formattedFavorites
        });
        
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Ошибка получения избранного' });
    }
});

app.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400'); 
    
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    
    res.sendFile(filePath);
});

app.get('/images/thumb/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.sendFile(filePath);
});

app.get('/api/homepage-data', async (req, res) => {
    try {
        console.log(' API Gateway: Запрос данных главной страницы');
        const connection = await getConnection();
        
        const [categories, brands, featuredProducts, promotions, stats] = await Promise.all([
            connection.execute('SELECT id, name, description, image FROM categories WHERE id IS NOT NULL ORDER BY name ASC'),
            connection.execute('SELECT id, name, description FROM brands WHERE id IS NOT NULL ORDER BY name ASC'),
            
            connection.execute(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.is_active = TRUE AND p.status IN ('hit', 'new')
                ORDER BY p.created_at DESC 
                LIMIT 8
            `),
            
            connection.execute(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.is_active = TRUE AND p.discount_percent > 0
                ORDER BY p.discount_percent DESC 
                LIMIT 6
            `),
            
            connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as total_products,
                    (SELECT COUNT(*) FROM categories) as total_categories,
                    (SELECT COUNT(*) FROM brands) as total_brands
            `)
        ]);

        const formatProducts = (products) => products[0].map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            finalPrice: product.discount_percent > 0 ? 
                Math.round(product.price * (1 - product.discount_percent / 100)) : product.price
        }));

        const response = {
            success: true,
            data: {
                categories: categories[0],
                brands: brands[0],
                featuredProducts: formatProducts(featuredProducts),
                promotions: formatProducts(promotions),
                stats: stats[0][0],
                banners: [
                    {
                        id: 1,
                        title: "Скидки до 30% на сантехнику",
                        description: "Только этой осенью",
                        image: "/static/banner1.jpg",
                        link: "/catalog?discount=true",
                        bgColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    },
                    {
                        id: 2, 
                        title: "Бесплатная доставка",
                        description: "При заказе от 10 000 ₽",
                        image: "/static/banner2.jpg",
                        link: "/delivery",
                        bgColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    }
                ]
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                version: "1.0",
                responseTime: Date.now()
            }
        };

        console.log(` API Gateway: Отправлены данные - ${categories[0].length} категорий, ${brands[0].length} брендов, ${response.data.featuredProducts.length} товаров`);
        res.json(response);

    } catch (error) {
        console.error(' API Gateway: Ошибка получения данных:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при загрузке данных',
            message: error.message 
        });
    }
});

app.get('/api/catalog', async (req, res) => {
    try {
        const { category, brand, material, color, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
        const connection = await getConnection();
        
        let query = `
            SELECT SQL_CALC_FOUND_ROWS 
                p.id, p.name, p.price, p.description, p.images, 
                p.discount_percent, p.stock_quantity, p.material, p.color,
                p.created_at, c.name as category_name, b.name as brand_name
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            WHERE p.is_active = TRUE
        `;
        
        let params = [];
        
        if (category && category !== 'all' && category !== 'null') {
            query += ' AND p.category_id = ?';
            params.push(parseInt(category));
        }
        
        if (brand && brand !== 'all' && brand !== 'null') {
            query += ' AND p.brand_id = ?';
            params.push(parseInt(brand));
        }
        
        if (material && material !== 'all' && material !== 'null') {
            query += ' AND p.material = ?';
            params.push(material);
        }
        
        if (color && color !== 'all' && color !== 'null') {
            query += ' AND p.color = ?';
            params.push(color);
        }
        
        if (minPrice && !isNaN(minPrice)) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(minPrice));
        }
        
        if (maxPrice && !isNaN(maxPrice)) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(maxPrice));
        }
        
        const offset = (page - 1) * limit;
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        console.log('⚡ Catalog query:', { query, params });
        
        const [products] = await connection.execute(query, params);
        
        const [countResult] = await connection.execute('SELECT FOUND_ROWS() as total');
        
        const formattedProducts = products.map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            finalPrice: product.discount_percent > 0 ? 
                Math.round(product.price * (1 - product.discount_percent / 100)) : product.price,
            hasDiscount: product.discount_percent > 0
        }));
        
        res.json({
            success: true,
            data: {
                products: formattedProducts,
                pagination: {
                    totalCount: countResult[0].total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(countResult[0].total / limit),
                    hasNext: page < Math.ceil(countResult[0].total / limit),
                    hasPrev: page > 1
                }
            }
        });
        
    } catch (error) {
        console.error(' Catalog Service: Ошибка получения товаров:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки каталога',
            message: error.message 
        });
    }
});

app.post('/api/payments/create', authenticateToken, async (req, res) => {
    console.log(' === PAYMENT CREATION START ===');
    
    try {
        const { orderId, amount, description } = req.body;
        
        console.log(' Payment request data:', { orderId, amount, description });

        
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        if (!orderId || !amount || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверные данные заказа' 
            });
        }

        const mockPaymentData = {
            id: 'payment_' + Date.now(),
            status: 'pending',
            amount: {
                value: amount,
                currency: 'RUB'
            },
            confirmation: {
                type: 'redirect',
                confirmation_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/success?orderId=${orderId}`
            }
        };

        console.log(' Payment created:', mockPaymentData);

        const connection = await getConnection();
        await connection.execute(
            'UPDATE orders SET payment_status = "pending" WHERE id = ?',
            [orderId]
        );
        connection.release();

        res.json({
            success: true,
            paymentId: mockPaymentData.id,
            confirmationUrl: mockPaymentData.confirmation.confirmation_url,
            amount: amount,
            orderId: orderId,
            message: 'Платеж создан успешно'
        });

    } catch (error) {
        console.error(' PAYMENT CREATION ERROR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Внутренняя ошибка сервера',
            details: error.message
        });
    }
});

async function sendOrderConfirmationEmail(userId, orderId, amount) {
    let connection;
    try {
        connection = await getConnection();
        
        const [users] = await connection.execute(
            'SELECT email, name FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            console.log('User not found for email');
            return;
        }
        
        const user = users[0];
        
transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { padding: 20px; }
                    .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #e9ecef; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1> Заказ создан успешно!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Уважаемый(ая) ${user.name},</p>
                        <p>Ваш заказ <strong>#${orderId}</strong> успешно создан и ожидает оплаты.</p>
                        
                        <div class="order-details">
                            <h3>Детали заказа:</h3>
                            <p><strong>Номер заказа:</strong> #${orderId}</p>
                            <p><strong>Сумма к оплате:</strong> ${amount} руб.</p>
                            <p><strong>Дата создания:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
                        </div>
                        
                        <p>Для завершения оформления заказа необходимо произвести оплату.</p>
                        <p>После оплаты заказ будет передан в обработку и с вами свяжется наш менеджер.</p>
                    </div>
                    
                    <div class="footer">
                        <p>С уважением,<br><strong>Команда Russian Home</strong></p>
                        <p>Телефон: +7 (XXX) XXX-XX-XX<br>Email: support@russianhome.ru</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@russianhome.ru',
            to: user.email,
            subject: `Заказ #${orderId} создан - Russian Home`,
            html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        console.log(` Order confirmation email sent to ${user.email}`);
        
    } catch (error) {
        console.error(' Error sending order confirmation email:', error);
    } finally {
        if (connection) connection.release();
    }
}

app.post('/api/payments/webhook', express.json({ type: 'application/json' }), async (req, res) => {
    try {
        const { event, object } = req.body;
        
        if (event === 'payment.succeeded') {
            const orderId = object.metadata.orderId;
            const userId = object.metadata.userId;
            const connection = await getConnection();
            
            await connection.execute(
                'UPDATE orders SET payment_status = "paid", status = "processing" WHERE id = ? AND user_id = ?',
                [orderId, userId]
            );
            
            connection.release();
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

async function sendReceiptEmail(userId, orderId, paymentData) {
    let connection;
    try {
        connection = await getConnection();
        
        const [users] = await connection.execute(
            'SELECT email, name FROM users WHERE id = ?',
            [userId]
        );
        
        const [orders] = await connection.execute(`
            SELECT o.*, 
                    oi.quantity, oi.price, p.name as product_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = ?
        `, [orderId]);
        
        if (users.length === 0 || orders.length === 0) {
            console.log('User or order not found for email');
            return;
        }
        
        const user = users[0];
        const orderItems = orders;

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
                    .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { padding: 20px; }
                    .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    .total { font-size: 1.2em; font-weight: bold; text-align: right; }
                    .footer { background: #e9ecef; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1> Заказ успешно оплачен!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Уважаемый(ая) ${user.name},</p>
                        <p>Ваш заказ <strong>#${orderId}</strong> успешно оплачен.</p>
                        
                        <div class="order-details">
                            <h3>Детали заказа:</h3>
                            <p><strong>Дата оплаты:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
                            <p><strong>ID платежа:</strong> ${paymentData.id}</p>
                        </div>
                        
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Товар</th>
                                    <th>Количество</th>
                                    <th>Цена</th>
                                    <th>Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItems.map(item => `
                                    <tr>
                                        <td>${item.product_name}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.price} руб.</td>
                                        <td>${(item.quantity * item.price).toFixed(2)} руб.</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="total">
                            Итого: ${orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)} руб.
                        </div>
                        
                        <p>Мы уже начали обработку вашего заказа. В ближайшее время с вами свяжется наш менеджер для уточнения деталей доставки.</p>
                    </div>
                    
                    <div class="footer">
                        <p>С уважением,<br><strong>Команда Russian Home</strong></p>
                        <p>Телефон: +7 (XXX) XXX-XX-XX<br>Email: support@russianhome.ru</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@russianhome.ru',
            to: user.email,
            subject: `Заказ #${orderId} оплачен - Russian Home`,
            html: emailHtml
        };
        
        await transporter.sendMail(mailOptions);
        console.log(` Receipt email sent to ${user.email}`);
        
    } catch (error) {
        console.error(' Error sending email:', error);
    } finally {
        if (connection) connection.release();
    }
}

app.post('/api/payments/yookassa-webhook', express.json(), async (req, res) => {
    try {
        const { event, object } = req.body;
        
        if (event === 'payment.succeeded') {
            const orderId = object.metadata.orderId;
            const userId = object.metadata.userId;
            
            const connection = await getConnection();
            
            await connection.execute(
                'UPDATE orders SET payment_status = "paid", status = "processing" WHERE id = ?',
                [orderId]
            );
            
            await sendReceiptEmail(userId, orderId, object);
            
            connection.release();
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const connection = await pool.getConnection();
        
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        connection.release();
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const { product_id } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        if (!product_id) {
            return res.status(400).json({ error: 'ID товара обязателен' });
        }

        const connection = await getConnection();
        
        const [products] = await connection.execute(
            'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
            [product_id]
        );
        
        if (products.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const [existing] = await connection.execute(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.user.id, product_id]
        );
        
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Товар уже в избранном' });
        }
        
        await connection.execute(
            'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)',
            [req.user.id, product_id]
        );
        
        connection.release();
        
        res.json({ 
            success: true,
            message: 'Товар добавлен в избранное' 
        });
        
    } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({ error: 'Ошибка добавления в избранное' });
    }
});

app.delete('/api/favorites/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        await connection.execute(
            'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.user.id, productId]
        );
        
        connection.release();
        
        res.json({ 
            success: true,
            message: 'Товар удален из избранного' 
        });
        
    } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({ error: 'Ошибка удаления из избранного' });
    }
});

app.get('/api/favorites/check/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        const [favorites] = await connection.execute(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
            [req.user.id, productId]
        );
        
        connection.release();
        
        res.json({ 
            success: true,
            isFavorite: favorites.length > 0
        });
        
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ error: 'Ошибка проверки избранного' });
    }
});

app.post('/api/basket', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const { product_id, quantity = 1 } = req.body;
        const connection = await pool.getConnection();

        const [products] = await connection.execute(
            'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
            [product_id]
        );
        
        if (products.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const product = products[0];
        
        if (quantity > product.stock_quantity) {
            connection.release();
            return res.status(400).json({ 
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity} шт.` 
            });
        }
        
        const maxQuantity = Math.min(product.stock_quantity, 100); 
        const actualQuantity = Math.min(quantity, maxQuantity);
        
        const [existing] = await connection.execute(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [req.user.id, product_id]
        );
        
        if (existing.length > 0) {
            const newTotalQuantity = existing[0].quantity + actualQuantity;
            if (newTotalQuantity > product.stock_quantity) {
                connection.release();
                return res.status(400).json({ 
                    error: `Недостаточно товара на складе. В корзине уже ${existing[0].quantity} шт., доступно еще: ${product.stock_quantity - existing[0].quantity} шт.` 
                });
            }
            
            await connection.execute(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [actualQuantity, req.user.id, product_id]
            );
        } else {
            await connection.execute(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [req.user.id, product_id, actualQuantity]
            );
        }
        
        connection.release();
        
        res.json({ 
            success: true,
            message: 'Товар добавлен в корзину',
            addedQuantity: actualQuantity,
            availableQuantity: product.stock_quantity
        });
    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/basket/:productId', authenticateToken, async (req, res) => {
    try {
        const { quantity } = req.body;
        const connection = await pool.getConnection();
        
        const [products] = await connection.execute(
            'SELECT stock_quantity FROM products WHERE id = ? AND is_active = TRUE',
            [req.params.productId]
        );
        
        if (products.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const product = products[0];
        
        if (quantity > product.stock_quantity) {
            connection.release();
            return res.status(400).json({ 
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity} шт.` 
            });
        }
        
        const maxQuantity = Math.min(product.stock_quantity, 100);
        const actualQuantity = Math.min(quantity, maxQuantity);
        
        await connection.execute(
            'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
            [actualQuantity, req.user.id, req.params.productId]
        );
        
        connection.release();
        
        res.json({ 
            success: true,
            message: 'Количество обновлено',
            quantity: actualQuantity,
            availableQuantity: product.stock_quantity
        });
    } catch (error) {
        console.error('Ошибка обновления корзины:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/basket/:productId', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.execute(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [req.user.id, req.params.productId]
        );
        
        connection.release();
        
        res.json({ message: 'Товар удален из корзины' });
    } catch (error) {
        console.error('Ошибка удаления из корзины:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { shipping_method, shipping_address, customer_name, customer_phone, customer_email, comment } = req.body;
        connection = await getConnection();
        
        await connection.beginTransaction();

        const [cartItems] = await connection.execute(
            `SELECT c.*, p.price, p.name, p.discount_percent, p.stock_quantity
             FROM cart c 
             JOIN products p ON c.product_id = p.id 
             WHERE c.user_id = ?`,
            [req.user.id]
        );
        
        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                error: 'Корзина пуста' 
            });
        }

        const total_amount = cartItems.reduce((total, item) => {
            const finalPrice = item.discount_percent > 0 ? 
                Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
            return total + (finalPrice * item.quantity);
        }, 0);

setTimeout(async () => {
    try {
        await sendOrderEmail(orderData, userData, 'confirmation');
    } catch (emailError) {
        console.error('Асинхронная отправка email не удалась:', emailError);
    }
}, 1000);

        const [orderResult] = await connection.execute(
            `INSERT INTO orders (user_id, total_amount, shipping_method, shipping_address, 
             customer_name, customer_phone, customer_email, comment, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [req.user.id, total_amount, shipping_method, shipping_address, 
             customer_name, customer_phone, customer_email, comment]
        );
        
        const orderId = orderResult.insertId;

        for (const item of cartItems) {
            const finalPrice = item.discount_percent > 0 ? 
                Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
                
            await connection.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, finalPrice]
            );
            
            await connection.execute(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        await connection.execute('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
        
        await connection.commit();

        try {
            const userData = {
                name: customer_name,
                email: customer_email
            };
            
            const orderData = {
                id: orderId,
                total_amount: total_amount,
                shipping_method: shipping_method,
                shipping_address: shipping_address,
                created_at: new Date(),
                items: cartItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.discount_percent > 0 ? 
                        Math.round(item.price * (1 - item.discount_percent / 100)) : item.price
                }))
            };
            
            await sendOrderEmail(orderData, userData, 'confirmation');
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        setTimeout(async () => {
            try {
                console.log(` Order Service: Асинхронная обработка заказа #${orderId}`);
                
                const asyncConnection = await getConnection();
                
                await asyncConnection.execute(
                    'UPDATE orders SET status = "processing" WHERE id = ?',
                    [orderId]
                );
                
                asyncConnection.release();
                
            } catch (asyncError) {
                console.error(` Order Service: Ошибка асинхронной обработки:`, asyncError);
            }
        }, 1000);

        res.json({ 
            success: true,
            data: {
                orderId, 
                total_amount,
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            message: 'Заказ успешно создан! Проверьте вашу почту для подтверждения.',
            nextSteps: [
                'Письмо с подтверждением отправлено на ваш email',
                'Ожидайте подтверждения заказа менеджером',
                'Отслеживайте статус в личном кабинете'
            ]
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(' Order Service: Ошибка создания заказа:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при создании заказа' 
        });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/orders/:id/send-email', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { emailType = 'confirmation' } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        const [orders] = await connection.execute(`
            SELECT o.*, u.name, u.email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.id = ? AND o.user_id = ?
        `, [id, req.user.id]);
        
        if (orders.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = orders[0];
        
        const [items] = await connection.execute(`
            SELECT oi.*, p.name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [id]);
        
        connection.release();

        const orderData = {
            ...order,
            items: items
        };

        const userData = {
            name: order.customer_name || order.name,
            email: order.customer_email || order.email
        };

        await sendOrderEmail(orderData, userData, emailType);
        
        res.json({
            success: true,
            message: 'Email отправлен успешно'
        });
        
    } catch (error) {
        console.error('Send order email error:', error);
        res.status(500).json({ error: 'Ошибка отправки email' });
    }
});

app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        
        const [reviews] = await connection.execute(`
            SELECT 
                r.*, 
                u.name as user_name,
                rm.moderated_at,
                rm.moderation_comment
            FROM reviews r 
            LEFT JOIN users u ON r.user_id = u.id 
            LEFT JOIN review_moderation rm ON r.id = rm.review_id
            WHERE r.product_id = ? AND r.status = 'approved'
            ORDER BY r.created_at DESC
        `, [id]);
        
        connection.release();
        
        res.json({
            success: true,
            data: reviews
        });
        
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Ошибка получения отзывов' });
    }
});

app.post('/api/products/:id/reviews', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
        }

        const connection = await getConnection();
        
        const [existingReviews] = await connection.execute(
            'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (existingReviews.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот товар' });
        }
        
        await connection.execute(
            'INSERT INTO reviews (product_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, "pending")',
            [id, req.user.id, rating, comment]
        );
        
        connection.release();
        
        res.json({
            success: true,
            message: 'Отзыв добавлен и отправлен на модерацию'
        });
        
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Ошибка добавления отзыва' });
    }
});

app.get('/api/products/:id/rating', async (req, res) => {
    try {
        const { id } = req.params
        const connection = await getConnection()
        
        const [result] = await connection.execute(`
            SELECT 
                AVG(rating) as avg_rating,
                COUNT(*) as review_count,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
            FROM reviews 
            WHERE product_id = ?
        `, [id])
        
        connection.release()
        
        const ratingData = {
            avgRating: parseFloat(result[0].avg_rating) || 0,
            reviewCount: result[0].review_count || 0,
            distribution: {
                5: result[0].five_star || 0,
                4: result[0].four_star || 0,
                3: result[0].three_star || 0,
                2: result[0].two_star || 0,
                1: result[0].one_star || 0
            }
        }
        
        res.json({
            success: true,
            data: ratingData
        })
        
    } catch (error) {
        console.error('Get rating error:', error)
        res.status(500).json({ error: 'Ошибка получения рейтинга' })
    }
})

app.put('/api/admin/products/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, discount_percent, discount_start, discount_end, featured } = req.body;
        
        const connection = await getConnection();
        
        const [products] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const updateFields = [];
        const updateValues = [];
        
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        if (discount_percent !== undefined) {
            updateFields.push('discount_percent = ?');
            updateValues.push(parseInt(discount_percent));
        }
        
        if (discount_start !== undefined) {
            updateFields.push('discount_start = ?');
            updateValues.push(discount_start);
        }
        
        if (discount_end !== undefined) {
            updateFields.push('discount_end = ?');
            updateValues.push(discount_end);
        }
        
        if (featured !== undefined) {
            updateFields.push('featured = ?');
            updateValues.push(featured);
        }
        
        if (updateFields.length === 0) {
            connection.release();
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        updateValues.push(id);
        
        await connection.execute(
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        const [updatedProducts] = await connection.execute(
            `SELECT p.*, c.name as category_name, b.name as brand_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             LEFT JOIN brands b ON p.brand_id = b.id 
             WHERE p.id = ?`,
            [id]
        );
        
        connection.release();
        
        const product = {
            ...updatedProducts[0],
            images: updatedProducts[0].images ? JSON.parse(updatedProducts[0].images) : []
        };
        
        res.json({
            success: true,
            product,
            message: 'Статусы и скидки обновлены успешно'
        });
        
    } catch (error) {
        console.error('Update product status error:', error);
        res.status(500).json({ error: 'Ошибка обновления статусов' });
    }
});

app.get('/api/admin/update-product-statuses', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await getConnection();
        const now = new Date();
        
        console.log(' Автоматическое обновление статусов товаров...');
        
        const [expiredDiscounts] = await connection.execute(
            'UPDATE products SET discount_percent = 0, discount_start = NULL, discount_end = NULL WHERE discount_end IS NOT NULL AND discount_end < ?',
            [now]
        );
        
        console.log(` Сброшено скидок: ${expiredDiscounts.affectedRows}`);
        
        const [outOfStock] = await connection.execute(
            'UPDATE products SET status = "out_of_stock" WHERE stock_quantity = 0 AND auto_stock_status = TRUE AND status != "out_of_stock"'
        );
        
        console.log(` Обновлено статусов "Нет в наличии": ${outOfStock.affectedRows}`);
        
        const [backInStock] = await connection.execute(
            'UPDATE products SET status = "default" WHERE stock_quantity > 0 AND auto_stock_status = TRUE AND status = "out_of_stock"'
        );
        
        console.log(` Товаров вернулось в наличие: ${backInStock.affectedRows}`);
        
        connection.release();
        
        res.json({
            success: true,
            message: 'Статусы обновлены автоматически',
            stats: {
                expiredDiscounts: expiredDiscounts.affectedRows,
                outOfStock: outOfStock.affectedRows,
                backInStock: backInStock.affectedRows
            }
        });
        
    } catch (error) {
        console.error('Auto update statuses error:', error);
        res.status(500).json({ error: 'Ошибка автоматического обновления статусов' });
    }
});

app.post('/api/admin/products/bulk-discount', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { discount_percent, discount_days, category_id, brand_id, product_ids } = req.body;
        
        if (!discount_percent || discount_percent < 1 || discount_percent > 99) {
            return res.status(400).json({ error: 'Скидка должна быть от 1% до 99%' });
        }
        
        const connection = await getConnection();
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (discount_days || 7));
        
        let query = 'UPDATE products SET discount_percent = ?, discount_start = ?, discount_end = ? WHERE is_active = TRUE';
        let params = [discount_percent, startDate, endDate];
        
        if (category_id) {
            query += ' AND category_id = ?';
            params.push(category_id);
        }
        
        if (brand_id) {
            query += ' AND brand_id = ?';
            params.push(brand_id);
        }
        
        if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
            query += ' AND id IN (?)';
            params.push(product_ids);
        }
        
        const [result] = await connection.execute(query, params);
        
        connection.release();
        
        res.json({
            success: true,
            message: `Скидка ${discount_percent}% установлена для ${result.affectedRows} товаров`,
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('Bulk discount error:', error);
        res.status(500).json({ error: 'Ошибка установки массовой скидки' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        const [orders] = await connection.execute(`
            SELECT o.* 
            FROM orders o 
            WHERE o.user_id = ? 
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const [items] = await connection.execute(`
                    SELECT oi.*, p.name, p.images
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                `, [order.id]);

                return {
                    ...order,
                    items: items.map(item => ({
                        ...item,
                        images: item.images ? JSON.parse(item.images) : []
                    }))
                };
            })
        );

        res.json({
            success: true,
            data: ordersWithItems
        });

    } catch (error) {
        console.error('User Orders Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения заказов' 
        });
    }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const connection = await getConnection();
        
        const [orders] = await connection.execute(`
            SELECT o.* 
            FROM orders o 
            WHERE o.id = ? AND o.user_id = ?
        `, [id, req.user.id]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const [items] = await connection.execute(`
            SELECT oi.*, p.name, p.images, p.description
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);

        const order = {
            ...orders[0],
            items: items.map(item => ({
                ...item,
                images: item.images ? JSON.parse(item.images) : []
            }))
        };

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('User Order Detail Error:', error);
        res.status(500).json({ error: 'Ошибка получения заказа' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const connection = await getConnection();
        const [categories] = await connection.execute(`
            SELECT id, name, description, image 
            FROM categories 
            WHERE id IS NOT NULL 
            ORDER BY name ASC
        `);
        connection.release();
        
        res.json(categories);
    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({ error: 'Ошибка получения категорий' });
    }
});

app.get('/api/brands', async (req, res) => {
    try {
        const data = await withCache('brands', async () => {
            const connection = await getConnection();
            const [brands] = await connection.execute(
                'SELECT id, name, description FROM brands ORDER BY name ASC'
            );
            connection.release();
            return brands;
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/products', async (req, res) => {
    console.log(' ОБЩИЙ API Products запрос (для каталога)');
    try {
        const { 
            category, brand, minPrice, maxPrice, search, material, color, 
            page = 1, limit = 12, sortBy = 'created_at', sortOrder = 'DESC' 
        } = req.query;
        
        console.log(' API Products запрос с параметрами:', req.query);

        const connection = await pool.getConnection();
        
        const validSortFields = ['name', 'price', 'created_at', 'discount_percent', 'rating'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        let query = `
            SELECT SQL_CALC_FOUND_ROWS 
                p.id, p.name, p.price, p.description, p.images, 
                p.discount_percent, p.stock_quantity, p.material, p.color,
                p.created_at, c.name as category_name, b.name as brand_name,
                COALESCE(AVG(r.rating), 0) as rating
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE p.is_active = TRUE
        `;
        
        let params = [];
        let conditions = [];

        if (category && category !== 'null' && category !== 'undefined') {
            conditions.push('p.category_id = ?');
            params.push(parseInt(category));
        }
        
        if (brand && brand !== 'null' && brand !== 'undefined') {
            conditions.push('p.brand_id = ?');
            params.push(parseInt(brand));
        }
        
        if (material && material !== 'all') {
            conditions.push('p.material = ?');
            params.push(material);
        }
        
        if (color && color !== 'all') {
            conditions.push('p.color = ?');
            params.push(color);
        }
        
        if (minPrice && !isNaN(minPrice)) {
            conditions.push('p.price >= ?');
            params.push(parseFloat(minPrice));
        }
        
        if (maxPrice && !isNaN(maxPrice)) {
            conditions.push('p.price <= ?');
            params.push(parseFloat(maxPrice));
        }
        
        if (search) {
            conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        if (sortField === 'rating') {
            query += ` GROUP BY p.id ORDER BY rating ${order}`;
        } else {
            query += ` GROUP BY p.id ORDER BY p.${sortField} ${order}`;
        }
        
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
                
        console.log(' SQL запрос с сортировкой:', query);
        console.log(' Параметры:', params);

        const [products] = await connection.execute(query, params);
        console.log(` Найдено товаров: ${products.length}`);

        const [countResult] = await connection.execute('SELECT FOUND_ROWS() as total');
        
        connection.release();
        
        const formattedProducts = products.map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            finalPrice: product.discount_percent > 0 ? 
                Math.round(product.price * (1 - product.discount_percent / 100)) : product.price,
            hasDiscount: product.discount_percent > 0
        }));
        
        res.json({
            success: true,
            data: {
                products: formattedProducts,
                pagination: {
                    totalCount: countResult[0].total,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(countResult[0].total / limit),
                    hasNext: page < Math.ceil(countResult[0].total / limit),
                    hasPrev: page > 1
                },
                sort: {
                    sortBy: sortField,
                    sortOrder: order
                }
            }
        });
        
    } catch (error) {
        console.error(' Catalog Service: Ошибка получения товаров:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка загрузки каталога',
            message: error.message 
        });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [products] = await connection.execute(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ? AND p.is_active = TRUE',
            [req.params.id]
        );
        
        connection.release();
        
        if (products.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Товар не найден' 
            });
        }
        
        const product = {
            ...products[0],
            images: products[0].images ? JSON.parse(products[0].images) : [],
            finalPrice: products[0].discount_percent > 0 ? 
                products[0].price * (1 - products[0].discount_percent / 100) : products[0].price
        };
        
        res.json(product);
    } catch (error) {
        console.error('Ошибка получения продукта:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера' 
        });
    }
}); 

app.put('/api/admin/products/:id', authenticateToken, requireManagerOrAdmin, upload.array('images', 5), async (req, res) => {
        const { id } = req.params;
        const { name, price, description, category_id, brand_id, stock_quantity, material, color } = req.body; 
        
        console.log(' Update product data:', { material, color }); 

        const connection = await getConnection();

        const [currentProducts] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (currentProducts.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        let images = currentProducts[0].images ? JSON.parse(currentProducts[0].images) : [];
        
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            images = [...images, ...newImages];
        }

        await connection.execute(
            `UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, 
            brand_id = ?, stock_quantity = ?, material = ?, color = ?, images = ? WHERE id = ?`,
            [name, description, parseFloat(price), category_id || null, brand_id || null,
            parseInt(stock_quantity) || 0, material, color, JSON.stringify(images), id] 
        );

        const [products] = await connection.execute(
            `SELECT p.*, c.name as category_name, b.name as brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            WHERE p.id = ?`,
            [id]
        );

        connection.release();

        res.json({
            success: true,
            product: {
                ...products[0],
                images: products[0].images ? JSON.parse(products[0].images) : []
            }
        });

});

app.get('/api/admin/products/:id/check', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        
        const [products] = await connection.execute(
            'SELECT id, name FROM products WHERE id = ?',
            [id]
        );
        
        connection.release();
        
        if (products.length === 0) {
            return res.json({
                exists: false,
                message: 'Товар не найден'
            });
        }
        
        res.json({
            exists: true,
            product: products[0]
        });
        
    } catch (error) {
        console.error('Check product error:', error);
        res.status(500).json({ error: 'Ошибка проверки товара' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        console.log(' Delete product request:', { 
            id, 
            admin: req.user?.email,
            headers: req.headers
        });

        connection = await getConnection();

        const [products] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) {
            console.log(' Product not found:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Товар не найден' 
            });
        }

        const product = products[0];
        console.log(' Product found:', { id: product.id, name: product.name });

        const [orderItems] = await connection.execute(
            'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
            [id]
        );

        const orderCount = orderItems[0].count;
        console.log(' Product order count:', orderCount);

        if (orderCount > 0) {
            console.log('Deactivating product (exists in orders):', id);
            await connection.execute(
                'UPDATE products SET is_active = FALSE WHERE id = ?',
                [id]
            );
            
            res.json({ 
                success: true,
                message: 'Товар деактивирован (присутствует в заказах)',
                action: 'deactivated'
            });
        } else {
            console.log(' Deleting product completely:', id);
            
            await connection.execute('DELETE FROM cart WHERE product_id = ?', [id]);
            console.log(' Removed from cart');
            
            await connection.execute('DELETE FROM products WHERE id = ?', [id]);
            console.log(' Product deleted');
            
            res.json({ 
                success: true,
                message: 'Товар успешно удален',
                action: 'deleted'
            });
        }

    } catch (error) {
        console.error(' Delete product error:', error);
        console.error(' Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при удалении товара',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
            console.log(' Database connection released');
        }
    }
});

app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
    console.log(' АДМИН API Products запрос');
    try {
        console.log(' Admin Products Request from:', req.user?.email);
        
        const connection = await getConnection();
        
        const [products] = await connection.execute(`
            SELECT p.*, c.name as category_name, b.name as brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            ORDER BY p.created_at DESC
        `);
        
        console.log(` Admin: Найдено товаров: ${products.length}`);
        
        const formattedProducts = products.map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            finalPrice: product.discount_percent > 0 ? 
                Math.round(product.price * (1 - product.discount_percent / 100)) : product.price
        }));
        
        connection.release();
        
        res.json({
            success: true,
            data: formattedProducts
        });
        
    } catch (error) {
        console.error(' Admin Products Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения товаров',
            details: error.message
        });
    }
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await getConnection();
        
        const [orders] = await connection.execute(`
            SELECT 
                o.*, 
                u.name as customer_name, 
                u.email as customer_email,
                u.phone as customer_phone
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);

        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const [items] = await connection.execute(`
                    SELECT 
                        oi.*, 
                        p.name, 
                        p.images,
                        p.description
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                `, [order.id]);

                return {
                    ...order,
                    items: items.map(item => ({
                        ...item,
                        images: item.images ? JSON.parse(item.images) : []
                    }))
                };
            })
        );

        connection.release();

        res.json({
            success: true,
            data: ordersWithItems
        });

    } catch (error) {
        console.error(' Admin Orders Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения заказов' 
        });
    }
});

app.get('/api/admin/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        
        const [orders] = await connection.execute(`
            SELECT 
                o.*, 
                u.name as customer_name, 
                u.email as customer_email, 
                u.phone as customer_phone
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            WHERE o.id = ?
        `, [id]);

        if (orders.length === 0) {
            connection.release();
            return res.status(404).json({ 
                success: false,
                error: 'Заказ не найден' 
            });
        }

        const [items] = await connection.execute(`
            SELECT 
                oi.*, 
                p.name, 
                p.images, 
                p.description
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);

        connection.release();

        const order = {
            ...orders[0],
            items: items.map(item => ({
                ...item,
                images: item.images ? JSON.parse(item.images) : []
            }))
        };

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error(' Admin Order Detail Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения заказа' 
        });
    }
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(' Updating order status:', { id, status });
        
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false,
                error: 'Неверный статус заказа. Допустимые: ' + validStatuses.join(', ') 
            });
        }

        const connection = await getConnection();
        
        const [orders] = await connection.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            connection.release();
            return res.status(404).json({ 
                success: false,
                error: 'Заказ не найден' 
            });
        }
        
        await connection.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );

        connection.release();

        console.log(' Order status updated successfully');

        res.json({
            success: true,
            message: `Статус заказа обновлен на "${status}"`,
            data: {
                id: parseInt(id),
                status: status
            }
        });

    } catch (error) {
        console.error(' Update Order Status Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка обновления статуса заказа' 
        });
    }
});

app.get('/api/admin/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await getConnection();
        const [categories] = await connection.execute(`
            SELECT c.*, 
            COUNT(p.id) as products_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.name ASC
        `);

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Admin Categories Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения категорий' 
        });
    }
});

app.post('/api/admin/products', authenticateToken, requireManagerOrAdmin, upload.array('images', 10), async (req, res) => {
    let connection;
    try {
        console.log('CREATE PRODUCT REQUEST received');
        console.log('Files:', req.files?.length || 0);
        console.log('Body fields:', Object.keys(req.body));

        const { 
            name, 
            price, 
            description, 
            category_id, 
            brand_id, 
            stock_quantity, 
            material, 
            color
        } = req.body;

        if (!name || !price) {
            return res.status(400).json({ 
                success: false,
                error: 'Название и цена обязательны' 
            });
        }

        connection = await getConnection();

        if (category_id) {
            const [categories] = await connection.execute(
                'SELECT id FROM categories WHERE id = ?', 
                [category_id]
            );
            if (categories.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Категория не найдена' 
                });
            }
        }

        if (brand_id) {
            const [brands] = await connection.execute(
                'SELECT id FROM brands WHERE id = ?', 
                [brand_id]
            );
            if (brands.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Бренд не найден' 
                });
            }
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => `/uploads/${file.filename}`);
        }

        const [result] = await connection.execute(
            `INSERT INTO products 
            (name, description, price, category_id, brand_id, stock_quantity, material, color, images) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                description?.trim() || '',
                parseFloat(price),
                category_id || null,
                brand_id || null,
                parseInt(stock_quantity) || 0,
                material?.trim() || '',
                color?.trim() || '',
                JSON.stringify(images)
            ]
        );

        const productId = result.insertId;

        const [products] = await connection.execute(`
            SELECT p.*, c.name as category_name, b.name as brand_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN brands b ON p.brand_id = b.id 
            WHERE p.id = ?
        `, [productId]);

        const product = {
            ...products[0],
            images: products[0].images ? JSON.parse(products[0].images) : []
        };

        console.log(' Product created successfully:', { id: productId, name: product.name });

        res.json({
            success: true,
            data: product,
            message: 'Товар успешно создан'
        });

    } catch (error) {
        console.error(' CREATE PRODUCT ERROR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка создания товара: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/admin/diagnostics/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await getConnection();
        
        const [products] = await connection.execute(`
            SELECT id, name, is_active 
            FROM products 
            ORDER BY id DESC 
            LIMIT 20
        `);
        
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_products,
                COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_products,
                MAX(id) as max_id
            FROM products
        `);
        
        connection.release();
        
        res.json({
            success: true,
            data: {
                products: products,
                stats: stats[0],
                message: `Всего товаров: ${stats[0].total_products}, Активных: ${stats[0].active_products}, Макс ID: ${stats[0].max_id}`
            }
        });
        
    } catch (error) {
        console.error('Products diagnostics error:', error);
        res.status(500).json({ error: 'Ошибка диагностики' });
    }
});

app.put('/api/admin/categories/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        const connection = await getConnection();
        
        const [categories] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        if (categories.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }

        let imagePath = categories[0].image;
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        await connection.execute(
            'UPDATE categories SET name = ?, description = ?, image = ? WHERE id = ?',
            [name, description, imagePath, id]
        );

        const [updatedCategories] = await connection.execute(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            data: updatedCategories[0],
            message: 'Категория успешно обновлена'
        });

    } catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({ error: 'Ошибка обновления категории' });
    }
});

app.delete('/api/admin/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        console.log(' DELETE CATEGORY REQUEST:', { 
            id, 
            admin: req.user?.email 
        });

        connection = await getConnection();

        const [categories] = await connection.execute('SELECT * FROM categories WHERE id = ?', [id]);
        if (categories.length === 0) {
            console.log(' Category not found:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Категория не найдена' 
            });
        }

        const category = categories[0];
        console.log(' Category found:', { id: category.id, name: category.name });

        const [products] = await connection.execute(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [id]
        );

        const productCount = products[0].count;
        console.log(' Total products with this category:', productCount);

        const [productList] = await connection.execute(
            'SELECT id, name, is_active FROM products WHERE category_id = ? LIMIT 10',
            [id]
        );

        console.log(' Products with this category:', productList);

        if (productCount > 0) {
            console.log(' Cannot delete category - has products:', productCount);
            return res.status(400).json({ 
                success: false,
                error: 'Нельзя удалить категорию - есть товары в этой категории',
                productCount: productCount,
                products: productList
            });
        }

        console.log(' Deleting category:', id);
        const [result] = await connection.execute('DELETE FROM categories WHERE id = ?', [id]);
        
        console.log('Category deleted successfully, affected rows:', result.affectedRows);
        
        res.json({ 
            success: true,
            message: 'Категория успешно удалена',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error(' DELETE CATEGORY ERROR:', error);
        console.error(' Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при удалении категории: ' + error.message,
            details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
    } finally {
        if (connection) {
            connection.release();
            console.log(' Database connection released');
        }
    }
});

app.delete('/api/admin/filters/materials/:material', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { material } = req.params;
        
        connection = await getConnection();
        
        const [result] = await connection.execute(
            'UPDATE products SET material = NULL WHERE material = ? AND is_active = TRUE',
            [material]
        );
        
        connection.release();
        
        res.json({
            success: true,
            message: `Материал "${material}" удален из ${result.affectedRows} товаров`,
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка удаления материала' 
        });
    }
});

app.delete('/api/admin/filters/colors/:color', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { color } = req.params;
        
        connection = await getConnection();
        
        const [result] = await connection.execute(
            'UPDATE products SET color = NULL WHERE color = ? AND is_active = TRUE',
            [color]
        );
        
        connection.release();
        
        res.json({
            success: true,
            message: `Цвет "${color}" удален из ${result.affectedRows} товаров`,
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('Delete color error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка удаления цвета' 
        });
    }
});

app.post('/api/admin/brands', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Название бренда обязательно' });
        }

        const connection = await getConnection();
        
        const [result] = await connection.execute(
            'INSERT INTO brands (name, description) VALUES (?, ?)',
            [name, description]
        );

        const [brands] = await connection.execute(
            'SELECT * FROM brands WHERE id = ?',
            [result.insertId]
        );

        res.json({
            success: true,
            data: brands[0],
            message: 'Бренд успешно создан'
        });

    } catch (error) {
        console.error('Create Brand Error:', error);
        res.status(500).json({ error: 'Ошибка создания бренда' });
    }
});

app.delete('/api/admin/brands/:id', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        console.log(' DELETE BRAND REQUEST:', { 
            id, 
            admin: req.user?.email 
        });

        connection = await getConnection();

        const [brands] = await connection.execute('SELECT * FROM brands WHERE id = ?', [id]);
        if (brands.length === 0) {
            console.log(' Brand not found:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Бренд не найден' 
            });
        }

        const brand = brands[0];
        console.log(' Brand found:', { id: brand.id, name: brand.name });

        const [products] = await connection.execute(
            'SELECT COUNT(*) as count FROM products WHERE brand_id = ?',
            [id]
        );

        const productCount = products[0].count;
        console.log(' Total products with this brand:', productCount);

        const [productList] = await connection.execute(
            'SELECT id, name, is_active FROM products WHERE brand_id = ? LIMIT 10',
            [id]
        );

        console.log(' Products with this brand:', productList);

        if (productCount > 0) {
            console.log(' Cannot delete brand - has products:', productCount);
            return res.status(400).json({ 
                success: false,
                error: 'Нельзя удалить бренд - есть товары с этим брендом',
                productCount: productCount,
                products: productList
            });
        }

        console.log(' Deleting brand:', id);
        const [result] = await connection.execute('DELETE FROM brands WHERE id = ?', [id]);
        
        console.log(' Brand deleted successfully, affected rows:', result.affectedRows);
        
        res.json({ 
            success: true,
            message: 'Бренд успешно удален',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        console.error(' DELETE BRAND ERROR:', error);
        console.error(' Error details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при удалении бренда: ' + error.message,
            details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
    } finally {
        if (connection) {
            connection.release();
            console.log(' Database connection released');
        }
    }
});

app.post('/api/payments/create-test', authenticateToken, async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        
        console.log(' TEST PAYMENT for order:', orderId);

        const connection = await getConnection();
        await connection.execute(
            'UPDATE orders SET payment_status = "paid", status = "processing" WHERE id = ?',
            [orderId]
        );
        connection.release();

        res.json({
            success: true,
            paymentId: 'test_payment_' + Date.now(),
            confirmationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/success?orderId=${orderId}&test=true`,
            message: 'Тестовый платеж успешно обработан'
        });

    } catch (error) {
        console.error('Test payment error:', error);
        res.status(500).json({ error: 'Ошибка тестового платежа' });
    }
});

app.delete('/api/admin/categories/:id/force', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        console.log(' FORCE DELETE CATEGORY:', id);

        connection = await getConnection();

        const [updateResult] = await connection.execute(
            'UPDATE products SET category_id = NULL WHERE category_id = ?',
            [id]
        );

        console.log(' Products updated to NULL:', updateResult.affectedRows);

        const [deleteResult] = await connection.execute('DELETE FROM categories WHERE id = ?', [id]);
        
        console.log(' Category force deleted, affected rows:', deleteResult.affectedRows);
        
        res.json({ 
            success: true,
            message: `Категория принудительно удалена. ${updateResult.affectedRows} товаров перемещены в "без категории"`,
            productsUpdated: updateResult.affectedRows,
            categoryDeleted: deleteResult.affectedRows
        });

    } catch (error) {
        console.error(' FORCE DELETE CATEGORY ERROR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка принудительного удаления: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/admin/brands/:id/force', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        console.log(' FORCE DELETE BRAND:', id);

        connection = await getConnection();

        const [updateResult] = await connection.execute(
            'UPDATE products SET brand_id = NULL WHERE brand_id = ?',
            [id]
        );

        console.log(' Products updated to NULL:', updateResult.affectedRows);

        const [deleteResult] = await connection.execute('DELETE FROM brands WHERE id = ?', [id]);
        
        console.log(' Brand force deleted, affected rows:', deleteResult.affectedRows);
        
        res.json({ 
            success: true,
            message: `Бренд принудительно удален. ${updateResult.affectedRows} товаров перемещены в "без бренда"`,
            productsUpdated: updateResult.affectedRows,
            brandDeleted: deleteResult.affectedRows
        });

    } catch (error) {
        console.error(' FORCE DELETE BRAND ERROR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка принудительного удаления: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        server: 'Russian Home Backend',
        port: PORT
    });
});

app.post('/api/admin/cleanup/orphans', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const [categoryCleanup] = await connection.execute(`
            UPDATE products 
            SET category_id = NULL 
            WHERE category_id IS NOT NULL 
            AND category_id NOT IN (SELECT id FROM categories)
        `);

        const [brandCleanup] = await connection.execute(`
            UPDATE products 
            SET brand_id = NULL 
            WHERE brand_id IS NOT NULL 
            AND brand_id NOT IN (SELECT id FROM brands)
        `);

        console.log(' Cleanup results:', {
            categoriesCleaned: categoryCleanup.affectedRows,
            brandsCleaned: brandCleanup.affectedRows
        });

        res.json({
            success: true,
            message: `Очистка завершена. Обновлено: категорий - ${categoryCleanup.affectedRows}, брендов - ${brandCleanup.affectedRows}`,
            results: {
                categories: categoryCleanup.affectedRows,
                brands: brandCleanup.affectedRows
            }
        });

    } catch (error) {
        console.error(' CLEANUP ERROR:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка очистки: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/debug-routes', (req, res) => {
    const routes = [
        '/api/homepage-data',
        '/api/catalog',
        '/api/auth/register',
        '/api/auth/login', 
        '/api/cart',
        '/api/orders',
        '/api/categories',
        '/api/brands',
        '/api/products',
        '/api/init-db',
        '/api/debug-db'
    ];
    
    res.json({
        message: 'Доступные API маршруты',
        routes: routes,
        architecture: 'API Gateway + Microservices'
    });
});

app.get('/api/admin/reviews/moderation', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        const { status = 'pending' } = req.query;
        
        console.log('Admin fetching reviews for moderation with status:', status);
        
        connection = await getConnection();
        
        const query = `
            SELECT 
                r.*,
                u.name as user_name,
                u.email as user_email,
                p.name as product_name,
                rm.moderated_at,
                rm.moderation_comment
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            LEFT JOIN review_moderation rm ON r.id = rm.review_id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
        `;
        
        const [reviews] = await connection.execute(query, [status]);
        
        console.log(`Admin found ${reviews.length} reviews for moderation`);
        
        res.json({
            success: true,
            data: {
                reviews: reviews
            }
        });
        
    } catch (error) {
        console.error('Admin get reviews for moderation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения отзывов для модерации'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/admin/reviews/:reviewId/approve', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { reviewId } = req.params;
        const { moderation_comment = 'Одобрено менеджером' } = req.body;
        
        console.log('Approving review:', reviewId);
        
        connection = await getConnection();
        
        const [reviews] = await connection.execute(
            'SELECT * FROM reviews WHERE id = ?',
            [reviewId]
        );
        
        if (reviews.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Отзыв не найден' 
            });
        }
        
        await connection.execute(
            'UPDATE reviews SET status = "approved" WHERE id = ?',
            [reviewId]
        );
        
        await connection.execute(
            'INSERT INTO review_moderation (review_id, moderator_id, status, moderation_comment, moderated_at) VALUES (?, ?, "approved", ?, NOW())',
            [reviewId, req.user.id, moderation_comment]
        );
        
        console.log('Review approved successfully');
        
        res.json({
            success: true,
            message: 'Отзыв одобрен и опубликован'
        });
        
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка одобрения отзыва'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/admin/reviews/:reviewId/reject', authenticateToken, requireManagerOrAdmin, async (req, res) => {
    let connection;
    try {
        const { reviewId } = req.params;
        const { moderation_comment } = req.body;
        
        console.log('Rejecting review:', reviewId);
        
        if (!moderation_comment) {
            return res.status(400).json({ 
                success: false,
                error: 'Укажите причину отклонения' 
            });
        }
        
        connection = await getConnection();
        
        const [reviews] = await connection.execute(
            'SELECT * FROM reviews WHERE id = ?',
            [reviewId]
        );
        
        if (reviews.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Отзыв не найден' 
            });
        }
        
        await connection.execute(
            'UPDATE reviews SET status = "rejected" WHERE id = ?',
            [reviewId]
        );
        
        await connection.execute(
            'INSERT INTO review_moderation (review_id, moderator_id, status, moderation_comment, moderated_at) VALUES (?, ?, "rejected", ?, NOW())',
            [reviewId, req.user.id, moderation_comment]
        );
        
        console.log('Review rejected successfully');
        
        res.json({
            success: true,
            message: 'Отзыв отклонен'
        });
        
    } catch (error) {
        console.error('Reject review error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка отклонения отзыва'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/admin/reviews/moderation/stats', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        console.log('Admin fetching moderation stats');
        
        connection = await getConnection();
        
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reviews,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reviews,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reviews
            FROM reviews
        `);
        
        console.log('Admin moderation stats:', stats[0]);
        
        res.json({
            success: true,
            data: stats[0]
        });
        
    } catch (error) {
        console.error('Admin get moderation stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка получения статистики модерации'
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает!', 
        timestamp: new Date().toISOString(),
        routes: [
            '/api/homepage-data',
            '/api/categories', 
            '/api/brands',
            '/api/products',
            '/api/products/:id',
            '/api/auth/login',
            '/api/auth/register',
            '/api/profile',
            '/api/basket',
            '/api/init-db'
        ]
    });
});

app.get('/api/init-db', async (req, res) => {
    try {
        let connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        await connection.execute('CREATE DATABASE IF NOT EXISTS russian_home');
        await connection.end();

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'russian_home'
        });

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                phone VARCHAR(20),
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS brands (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category_id INT,
                brand_id INT,
                stock_quantity INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                discount_percent INT DEFAULT 0,
                images JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_cart_item (user_id, product_id)
            )
        `);

        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin@russianhome.ru', hashedPassword, 'Администратор', 'admin']
            );
            console.log(' Администратор создан');
        }

        const [categoryCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
        if (categoryCount[0].count === 0) {
            await connection.execute(
                'INSERT INTO categories (name, description) VALUES (?, ?), (?, ?), (?, ?)',
                ['Раковины', 'Стильные раковины', 'Унитазы', 'Современные унитазы', 'Смесители', 'Качественные смесители']
            );
            console.log(' Категории созданы');
        }

        const [brandCount] = await connection.execute('SELECT COUNT(*) as count FROM brands');
        if (brandCount[0].count === 0) {
            await connection.execute(
                'INSERT INTO brands (name, description) VALUES (?, ?), (?, ?), (?, ?)',
                ['Grohe', 'Немецкое качество', 'Hansgrohe', 'Инновации', 'Roca', 'Испанский стиль']
            );
            console.log(' Бренды созданы');
        }

        const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM products');
        if (productCount[0].count === 0) {
            await connection.execute(
                'INSERT INTO products (name, description, price, category_id, brand_id, stock_quantity) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
                [
                    'Раковина керамическая', 'Стильная керамическая раковина', 4500, 1, 1, 10,
                    'Смеситель хром', 'Элегантный смеситель', 3200, 3, 2, 15
                ]
            );
            console.log(' Товары созданы');
        }

        await connection.end();
        
        res.json({ 
            success: true, 
            message: 'База данных инициализирована!',
            admin: 'admin@russianhome.ru / admin123'
        });
        
    } catch (error) {
        console.error(' Ошибка инициализации БД:', error);
        res.status(500).json({ success: false, error: error.message });
    }

await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_material ON products(material)');
await connection.execute('CREATE INDEX IF NOT EXISTS idx_products_color ON products(color)');
});

app.get('/api/init-db-indexes', async (req, res) => {
    try {
        const connection = await getConnection();
        
        await connection.execute(`
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
            CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
            CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
            CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
            CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
            CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
        `);
        
        res.json({ success: true, message: 'Индексы созданы' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/diagnostics/brands', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const [allBrands] = await connection.execute('SELECT * FROM brands');
        
        const brandsWithProducts = await Promise.all(
            allBrands.map(async (brand) => {
                const [products] = await connection.execute(
                    'SELECT id, name, is_active FROM products WHERE brand_id = ?',
                    [brand.id]
                );
                
                return {
                    brand: brand,
                    products: products,
                    activeProducts: products.filter(p => p.is_active).length,
                    inactiveProducts: products.filter(p => !p.is_active).length
                };
            })
        );
        
        connection.release();
        
        res.json({
            success: true,
            data: brandsWithProducts
        });
        
    } catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({ error: 'Ошибка диагностики' });
    }
});

app.get('/api/debug/database-structure', authenticateToken, requireAdmin, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        let categoriesStructure = [];
        let brandsStructure = [];
        
        if (tableNames.includes('categories')) {
            const [structure] = await connection.execute('DESCRIBE categories');
            categoriesStructure = structure;
        }
        
        if (tableNames.includes('brands')) {
            const [structure] = await connection.execute('DESCRIBE brands');
            brandsStructure = structure;
        }
        
        const [categoriesData] = await connection.execute('SELECT id, name FROM categories LIMIT 5');
        const [brandsData] = await connection.execute('SELECT id, name FROM brands LIMIT 5');
        
        connection.release();
        
        res.json({
            success: true,
            tables: tableNames,
            categories: {
                structure: categoriesStructure,
                sampleData: categoriesData
            },
            brands: {
                structure: brandsStructure,
                sampleData: brandsData
            }
        });
        
    } catch (error) {
        console.error('Database structure check error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.use(express.static(path.join(__dirname, '../frontend/dist'), {
    index: false
}));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

async function startServer() {
    try {
        await initializeDatabase();
        
        const connection = await getConnection();
        console.log(' База данных подключена');
        connection.release();
        
        app.listen(PORT, () => {
            console.log(` Russian Home Server запущен на порту ${PORT}`);
            console.log(` API Gateway: http://localhost:${PORT}/api/homepage-data`);
            console.log(` Catalog Service: http://localhost:${PORT}/api/catalog`);
            console.log(` Auth Service: http://localhost:${PORT}/api/auth`);
            console.log(` Order Service: http://localhost:${PORT}/api/orders`);
            console.log('');
            console.log(' Архитектура: API Gateway + Microservices');
            console.log(' Оптимизация: Параллельные запросы + Асинхронная обработка');
        });
        
    } catch (error) {
        console.error(' Ошибка запуска сервера:', error);
    }
}

async function initializeDatabase() {
    let connection;
    try {
        console.log(' Инициализация базы данных...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        console.log(' Подключение к MySQL установлено');
        
        await connection.query('CREATE DATABASE IF NOT EXISTS russian_home');
        console.log(' База данных russian_home создана/проверена');
        
        await connection.end();
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'russian_home'
        });
        
        console.log(' Подключение к базе данных russian_home установлено');
        
        console.log(' Создаем таблицы...');
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' Таблица users создана/проверена');

await connection.query(`
    CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
        console.log(' Таблица categories создана/проверена');

await connection.query(`
    CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
        console.log(' Таблица brands создана/проверена');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category_id INT,
                brand_id INT,
                stock_quantity INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                discount_percent INT DEFAULT 0,
                status ENUM('new', 'hit', 'sale', 'default') DEFAULT 'default',
                images JSON,
                specifications JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

try {
    await connection.execute(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS auto_stock_status BOOLEAN DEFAULT TRUE
    `);
    console.log(' Поле auto_stock_status проверено/добавлено');
    
    await connection.execute(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS discount_start DATETIME NULL
    `);
    console.log(' Поле discount_start проверено/добавлено');
    
    await connection.execute(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS discount_end DATETIME NULL
    `);
    console.log(' Поле discount_end проверено/добавлено');
    
} catch (error) {
    console.log('  Поля уже существуют:', error.message);
}
        console.log(' Таблица products создана/проверена');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_cart_item (user_id, product_id)
            )
        `);
        console.log(' Таблица cart создана/проверена');

        await connection.query(`
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' Таблица orders создана/проверена');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL
            )
        `);
        console.log(' Таблица order_items создана/проверена');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log(' Таблица reviews создана/проверена');

        console.log(' Добавляем тестовые данные...');

        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin@russianhome.ru', hashedPassword, 'Администратор', 'admin']
            );
            console.log(' Администратор создан (email: admin@russianhome.ru, password: admin123)');
        }

        const [categoryCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
        if (categoryCount[0].count === 0) {
            await connection.execute(
                'INSERT INTO categories (name, description) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)',
                [
                    'Раковины', 'Стильные раковины для ванной комнаты и кухни',
                    'Унитазы', 'Современные унитазы и инсталляции', 
                    'Смесители', 'Качественные смесители для воды',
                    'Ванны', 'Акриловые, чугунные и стальные ванны',
                    'Душевые кабины', 'Душевые уголки и кабины'
                ]
            );
            console.log(' Категории добавлены');
        }

        const [brandCount] = await connection.execute('SELECT COUNT(*) as count FROM brands');
        if (brandCount[0].count === 0) {
            await connection.execute(
                'INSERT INTO brands (name, description) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)',
                [
                    'Grohe', 'Немецкое качество и дизайн',
                    'Hansgrohe', 'Инновации в мире сантехники',
                    'Roca', 'Испанский стиль и надежность',
                    'Cersanit', 'Польское качество по доступным ценам',
                    'Jacob Delafon', 'Французская элегантность'
                ]
            );
            console.log(' Бренды добавлены');
        }

        const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM products');
        if (productCount[0].count === 0) {
            const [categories] = await connection.execute('SELECT id FROM categories ORDER BY id');
            const [brands] = await connection.execute('SELECT id FROM brands ORDER BY id');
            
            if (categories.length > 0 && brands.length > 0) {
                await connection.execute(`
                    INSERT INTO products (name, description, price, category_id, brand_id, stock_quantity) 
                    VALUES 
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?)
                `, [
                    'Раковина керамическая белая', 'Стильная керамическая раковина для ванной комнаты', 4500.00, categories[0].id, brands[0].id, 10,
                    'Унитаз подвесной с инсталляцией', 'Современный подвесной унитаз с системой скрытого монтажа', 12500.00, categories[1].id, brands[1].id, 5,
                    'Смеситель для раковины хром', 'Элегантный смеситель с аэратором для экономии воды', 3200.00, categories[2].id, brands[2].id, 15,
                    'Акриловая ванна 170см', 'Комфортная акриловая ванна с антискользящим покрытием', 22000.00, categories[3].id, brands[3].id, 3,
                    'Душевая кабина угловая', 'Стеклянная душевая кабина с гидромассажем', 18500.00, categories[4].id, brands[4].id, 2
                ]);
                console.log(' Товары добавлены');
            }
        }

        console.log(' Инициализация базы данных завершена успешно!');
        
    } catch (error) {
        console.error(' Ошибка инициализации базы данных:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

app.post('/api/auth/register', async (req, res) => {
    let connection;
    try {
        const { email, phone, password, name } = req.body;
        connection = await pool.getConnection();
        
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь с таким email уже существует' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); 
        
        const [result] = await connection.execute(
            'INSERT INTO users (email, phone, password, name, verification_code, verification_code_expires) VALUES (?, ?, ?, ?, ?, ?)',
            [email, phone, hashedPassword, name, verificationCode, verificationCodeExpires]
        );

        console.log('User registered with ID:', result.insertId);

        try {
            await sendVerificationCodeEmail({ email, name }, verificationCode);
            console.log('Verification code sent to:', email);
        } catch (emailError) {
            console.error('Failed to send verification code:', emailError);
        }

        connection.release();
        
        res.json({ 
            success: true,
            message: 'Код подтверждения отправлен на ваш email',
            data: {
                email: email,
                requiresVerification: true
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        if (connection) connection.release();
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
}); 

app.post('/api/auth/verify-email', async (req, res) => {
    res.status(400).json({ 
        success: false,
        error: 'Используйте систему подтверждения с кодом. Запросите новый код.' 
    });
});

app.post('/api/auth/resend-verification-email', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.execute(
        'SELECT email, name FROM users WHERE id = ?',
        [req.user.id]
    );
    
    if (users.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = users[0];
    connection.release();

    try {
        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        await connection.execute(
            'UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?',
            [verificationCode, verificationCodeExpires, req.user.id]
        );
        
        await sendVerificationCodeEmail(user, verificationCode);
        
        res.json({ 
            success: true,
            message: 'Код подтверждения отправлен на ваш email'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка отправки кода' });
    }
});

async function startServer() {
    try {
        await initializeDatabase();
        
        const connection = await getConnection();
        console.log(' База данных подключена');
        connection.release();
        
        app.listen(PORT, () => {
            console.log(` Russian Home Server запущен на порту ${PORT}`);
            console.log(` API Gateway: http://localhost:${PORT}/api/homepage-data`);
            console.log(` Catalog Service: http://localhost:${PORT}/api/catalog`);
            console.log(` Auth Service: http://localhost:${PORT}/api/auth`);
            console.log(` Order Service: http://localhost:${PORT}/api/orders`);
            console.log('');
            console.log(' Архитектура: API Gateway + Microservices');
            console.log(' Система ролей: Админ, Менеджер, Пользователь');
            console.log(' Оптимизация: Параллельные запросы + Асинхронная обработка');
        });
        
    } catch (error) {
        console.error(' Ошибка запуска сервера:', error);
    }
}

startServer().catch(console.error);