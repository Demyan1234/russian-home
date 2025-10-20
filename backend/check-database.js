const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'russian_home'
        });

        console.log(' Успешное подключение к базе данных');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log(' Таблицы в базе данных:', tables.map(t => Object.values(t)[0]));

        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(' Количество пользователей:', users[0].count);

        const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log(' Количество товаров:', products[0].count);

        await connection.end();
        console.log(' Проверка базы данных завершена успешно!');
        
    } catch (error) {
        console.error(' Ошибка проверки базы данных:', error.message);
        console.log(' Проверьте:');
        console.log('   - Запущен ли MySQL сервер');
        console.log('   - Правильные ли настройки в .env файле');
        console.log('   - Существует ли база данных russian_home');
    }
}

checkDatabase();