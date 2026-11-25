const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '9215',
    database: 'beancraft_coffee',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test MySQL connection
async function testConnection() {
    try {
        const connection = await db.getConnection();

        console.log('MySQL connected successfully!');

        connection.release();

    } catch (error) {
        console.error('MySQL connection failed:', error.message);
    }
}

testConnection();

module.exports = db;