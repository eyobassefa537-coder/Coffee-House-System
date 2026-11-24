const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Allowed database tables
const tables = [
    'products',
    'categories',
    'customers',
    'users',
    'orders',
    'order_items',
    'payments'
];

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1 AS connected');

        res.json({
            success: true,
            message: 'MySQL connected successfully!',
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET all records
app.get('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;

        if (!tables.includes(table)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const [rows] = await db.query(`SELECT * FROM ${table}`);

        // Hide password information from API responses
        let safeRows = rows;

        if (table === 'users') {
            safeRows = rows.map(
                ({ password, password_hash, ...user }) => user
            );
        }

        res.json({
            success: true,
            count: safeRows.length,
            data: safeRows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET record by ID
app.get('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;

        if (!tables.includes(table)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);

        const primaryKey = columns.find(
            column => column.Key === 'PRI'
        );

        if (!primaryKey) {
            return res.status(400).json({
                success: false,
                message: 'Primary key not found'
            });
        }

        const [rows] = await db.query(
            `SELECT * FROM ${table} WHERE ${primaryKey.Field} = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        let record = rows[0];

        if (table === 'users') {
            const {
                password,
                password_hash,
                ...safeUser
            } = record;

            record = safeUser;
        }

        res.json({
            success: true,
            data: record
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST new record
app.post('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const data = req.body;

        if (!tables.includes(table)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);

        const allowedColumns = columns
            .map(column => column.Field)
            .filter(column => column !== columns.find(c => c.Key === 'PRI')?.Field);

        const fields = Object.keys(data).filter(
            field => allowedColumns.includes(field)
        );

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided'
            });
        }

        const values = fields.map(field => data[field]);
        const placeholders = fields.map(() => '?').join(', ');

        const sql = `
            INSERT INTO ${table} (${fields.join(', ')})
            VALUES (${placeholders})
        `;

        const [result] = await db.query(sql, values);

        res.status(201).json({
            success: true,
            message: 'Record created successfully',
            insertId: result.insertId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// PUT update record
app.put('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        const data = req.body;

        if (!tables.includes(table)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);

        const primaryKey = columns.find(
            column => column.Key === 'PRI'
        );

        if (!primaryKey) {
            return res.status(400).json({
                success: false,
                message: 'Primary key not found'
            });
        }

        const allowedColumns = columns
            .map(column => column.Field)
            .filter(field => field !== primaryKey.Field);

        const fields = Object.keys(data).filter(
            field => allowedColumns.includes(field)
        );

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided'
            });
        }

        const updates = fields
            .map(field => `${field} = ?`)
            .join(', ');

        const values = fields.map(field => data[field]);
        values.push(id);

        const sql = `
            UPDATE ${table}
            SET ${updates}
            WHERE ${primaryKey.Field} = ?
        `;

        const [result] = await db.query(sql, values);

        res.json({
            success: true,
            message: 'Record updated successfully',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE record
app.delete('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;

        if (!tables.includes(table)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid table name'
            });
        }

        const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);

        const primaryKey = columns.find(
            column => column.Key === 'PRI'
        );

        if (!primaryKey) {
            return res.status(400).json({
                success: false,
                message: 'Primary key not found'
            });
        }

        const [result] = await db.query(
            `DELETE FROM ${table} WHERE ${primaryKey.Field} = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Record deleted successfully',
            affectedRows: result.affectedRows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Sales API (to be implemented)
app.get('/api/sales', (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Sales API is not implemented yet'
    });
});


// GET PRODUCTS FROM MYSQL
app.get('/api/products', (req, res) => {
    const sql = 'SELECT * FROM products WHERE is_available = 1';

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve products'
            });
        }

        res.json({
            success: true,
            count: results.length,
            data: results
        });
    });
});


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Coffee House server running at http://localhost:${PORT}`);
});