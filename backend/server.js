"use strict";

const express = require("express");
const path = require("path");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

/* ==========================================
   MIDDLEWARE
========================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend")));

/* ==========================================
   DATABASE HELPER
========================================== */

async function query(sql, params = []) {
    const [rows] = await db.execute(sql, params);
    return rows;
}

function handleError(res, error, message = "Server error") {
    console.error(message, error);

    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "This record already exists."
        });
    }

    if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        error.code === "ER_ROW_IS_REFERENCED"
    ) {
        return res.status(409).json({
            success: false,
            message: "This record is being used by another record and cannot be deleted."
        });
    }

    return res.status(500).json({
        success: false,
        message
    });
}

/* ==========================================
   HOME
========================================== */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ==========================================
   DATABASE TEST
========================================== */

app.get("/api/test-db", async (req, res) => {
    try {
        await query("SELECT 1");
        res.json({
            success: true,
            message: "MySQL connected successfully."
        });
    } catch (error) {
        handleError(res, error, "Database connection failed.");
    }
});

/* ==========================================
   DASHBOARD
========================================== */

app.get("/api/dashboard/summary", async (req, res) => {
    try {
        const sales = await query(`
            SELECT COALESCE(SUM(total_amount), 0) AS totalSales
            FROM orders
            WHERE order_status = 'completed'
        `);

        const orders = await query(`
            SELECT COUNT(*) AS totalOrders
            FROM orders
        `);

        const customers = await query(`
            SELECT COUNT(*) AS totalCustomers
            FROM customers
        `);

        const products = await query(`
            SELECT COUNT(*) AS totalProducts
            FROM products
        `);

        res.json({
            totalSales: Number(sales[0].totalSales),
            totalOrders: Number(orders[0].totalOrders),
            totalCustomers: Number(customers[0].totalCustomers),
            totalProducts: Number(products[0].totalProducts)
        });
    } catch (error) {
        handleError(res, error, "Could not load dashboard.");
    }
});

/* ==========================================
   PRODUCTS
========================================== */

app.get("/api/products", async (req, res) => {
    try {
        const products = await query(`
            SELECT
                p.product_id,
                p.product_name,
                p.category_id,
                c.category_name,
                p.price,
                p.stock_quantity,
                p.is_available,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            ORDER BY p.product_id DESC
        `);

        res.json(products);
    } catch (error) {
        handleError(res, error, "Could not load products.");
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const products = await query(
            "SELECT * FROM products WHERE product_id = ?",
            [req.params.id]
        );

        if (!products.length) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json(products[0]);
    } catch (error) {
        handleError(res, error, "Could not load product.");
    }
});

app.post("/api/products", async (req, res) => {
    try {
        const {
            product_name,
            category_id,
            price,
            stock_quantity
        } = req.body;

        if (!product_name || !category_id || price === undefined) {
            return res.status(400).json({
                message: "Product name, category and price are required."
            });
        }

        const result = await query(
            `INSERT INTO products
                (product_name, category_id, price, stock_quantity, is_available)
             VALUES (?, ?, ?, ?, 1)`,
            [
                product_name.trim(),
                category_id,
                Number(price),
                Number(stock_quantity || 0)
            ]
        );

        res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product_id: result.insertId
        });
    } catch (error) {
        handleError(res, error, "Could not create product.");
    }
});

app.put("/api/products/:id", async (req, res) => {
    try {
        const {
            product_name,
            category_id,
            price,
            stock_quantity
        } = req.body;

        const result = await query(
            `UPDATE products
             SET product_name = ?,
                 category_id = ?,
                 price = ?,
                 stock_quantity = ?
             WHERE product_id = ?`,
            [
                product_name,
                category_id,
                Number(price),
                Number(stock_quantity),
                req.params.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json({
            success: true,
            message: "Product updated successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not update product.");
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const result = await query(
            "DELETE FROM products WHERE product_id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json({
            success: true,
            message: "Product deleted successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not delete product.");
    }
});

/* ==========================================
   CATEGORIES
========================================== */

app.get("/api/categories", async (req, res) => {
    try {
        const categories = await query(`
            SELECT *
            FROM categories
            ORDER BY category_id DESC
        `);

        res.json(categories);
    } catch (error) {
        handleError(res, error, "Could not load categories.");
    }
});

app.post("/api/categories", async (req, res) => {
    try {
        const { category_name, description } = req.body;

        if (!category_name) {
            return res.status(400).json({
                message: "Category name is required."
            });
        }

        const result = await query(
            `INSERT INTO categories (category_name, description)
             VALUES (?, ?)`,
            [category_name.trim(), description || null]
        );

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            category_id: result.insertId
        });
    } catch (error) {
        handleError(res, error, "Could not create category.");
    }
});

app.put("/api/categories/:id", async (req, res) => {
    try {
        const { category_name, description } = req.body;

        const result = await query(
            `UPDATE categories
             SET category_name = ?, description = ?
             WHERE category_id = ?`,
            [category_name, description || null, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.json({
            success: true,
            message: "Category updated successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not update category.");
    }
});

app.delete("/api/categories/:id", async (req, res) => {
    try {
        const result = await query(
            "DELETE FROM categories WHERE category_id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.json({
            success: true,
            message: "Category deleted successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not delete category.");
    }
});

/* ==========================================
   CUSTOMERS
========================================== */

app.get("/api/customers", async (req, res) => {
    try {
        const customers = await query(`
            SELECT *
            FROM customers
            ORDER BY customer_id DESC
        `);

        res.json(customers);
    } catch (error) {
        handleError(res, error, "Could not load customers.");
    }
});

app.post("/api/customers", async (req, res) => {
    try {
        const { customer_name, phone, email } = req.body;

        if (!customer_name) {
            return res.status(400).json({
                message: "Customer name is required."
            });
        }

        const result = await query(
            `INSERT INTO customers
                (customer_name, phone, email)
             VALUES (?, ?, ?)`,
            [
                customer_name.trim(),
                phone || null,
                email || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Customer created successfully.",
            customer_id: result.insertId
        });
    } catch (error) {
        handleError(res, error, "Could not create customer.");
    }
});

app.put("/api/customers/:id", async (req, res) => {
    try {
        const { customer_name, phone, email } = req.body;

        const result = await query(
            `UPDATE customers
             SET customer_name = ?, phone = ?, email = ?
             WHERE customer_id = ?`,
            [
                customer_name,
                phone || null,
                email || null,
                req.params.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.json({
            success: true,
            message: "Customer updated successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not update customer.");
    }
});

app.delete("/api/customers/:id", async (req, res) => {
    try {
        const result = await query(
            "DELETE FROM customers WHERE customer_id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.json({
            success: true,
            message: "Customer deleted successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not delete customer.");
    }
});

/* ==========================================
   INVENTORY
========================================== */

app.get("/api/inventory", async (req, res) => {
    try {
        const inventory = await query(`
            SELECT
                p.product_id,
                p.product_name,
                c.category_name,
                p.price,
                p.stock_quantity,
                CASE
                    WHEN p.stock_quantity <= 5 THEN 'Low Stock'
                    ELSE 'Available'
                END AS stock_status
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            ORDER BY p.product_name ASC
        `);

        res.json(inventory);
    } catch (error) {
        handleError(res, error, "Could not load inventory.");
    }
});

app.get("/api/inventory/low-stock", async (req, res) => {
    try {
        const inventory = await query(`
            SELECT
                product_id,
                product_name,
                stock_quantity
            FROM products
            WHERE stock_quantity <= 5
            ORDER BY stock_quantity ASC
        `);

        res.json(inventory);
    } catch (error) {
        handleError(res, error, "Could not load low-stock products.");
    }
});

app.put("/api/inventory/:id", async (req, res) => {
    try {
        const { stock_quantity } = req.body;

        if (
            stock_quantity === undefined ||
            !Number.isInteger(Number(stock_quantity)) ||
            Number(stock_quantity) < 0
        ) {
            return res.status(400).json({
                message: "Enter a valid stock quantity."
            });
        }

        const result = await query(
            `UPDATE products
             SET stock_quantity = ?
             WHERE product_id = ?`,
            [Number(stock_quantity), req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json({
            success: true,
            message: "Stock updated successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not update stock.");
    }
});

/* ==========================================
   ORDERS
========================================== */

app.get("/api/orders", async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || 100, 1),
            500
        );

        const orders = await query(
            `SELECT
                o.order_id,
                o.customer_id,
                COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
                o.user_id,
                u.full_name AS cashier,
                o.order_date,
                o.total_amount,
                o.order_status
             FROM orders o
             LEFT JOIN customers c
                ON o.customer_id = c.customer_id
             LEFT JOIN users u
                ON o.user_id = u.user_id
             ORDER BY o.order_id DESC
             LIMIT ?`,
            [limit]
        );

        res.json(orders);
    } catch (error) {
        handleError(res, error, "Could not load orders.");
    }
});

app.get("/api/orders/:id", async (req, res) => {
    try {
        const orders = await query(
            `SELECT *
             FROM orders
             WHERE order_id = ?`,
            [req.params.id]
        );

        if (!orders.length) {
            return res.status(404).json({ message: "Order not found." });
        }

        const items = await query(
            `SELECT
                oi.*,
                p.product_name
             FROM order_items oi
             LEFT JOIN products p
                ON oi.product_id = p.product_id
             WHERE oi.order_id = ?`,
            [req.params.id]
        );

        res.json({
            ...orders[0],
            items
        });
    } catch (error) {
        handleError(res, error, "Could not load order.");
    }
});

/* ==========================================
   CREATE ORDER
========================================== */

app.post("/api/orders", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            customer_id,
            items,
            payment_method
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            connection.release();

            return res.status(400).json({
                message: "An order must contain at least one product."
            });
        }

        const allowedMethods = [
            "cash",
            "mobile_money",
            "bank_transfer"
        ];

        if (!allowedMethods.includes(payment_method)) {
            connection.release();

            return res.status(400).json({
                message: "Invalid payment method."
            });
        }

        await connection.beginTransaction();

        // Use an existing active user for the cashier record.
        // This is a temporary fallback until login is connected.
        const [users] = await connection.execute(
            `SELECT user_id
             FROM users
             WHERE is_active = 1
             ORDER BY user_id ASC
             LIMIT 1`
        );

        if (!users.length) {
            throw new Error(
                "No active staff account exists. An active user is required to create an order."
            );
        }

        const userId = users[0].user_id;

        let totalAmount = 0;
        const verifiedItems = [];

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                !Number.isInteger(quantity) ||
                productId <= 0 ||
                quantity <= 0
            ) {
                throw new Error("Invalid product or quantity in order.");
            }

            const [products] = await connection.execute(
                `SELECT product_id, product_name, price, stock_quantity
                 FROM products
                 WHERE product_id = ?
                 FOR UPDATE`,
                [productId]
            );

            if (!products.length) {
                throw new Error(`Product ${productId} was not found.`);
            }

            const product = products[0];

            if (Number(product.stock_quantity) < quantity) {
                throw new Error(
                    `Not enough stock for ${product.product_name}.`
                );
            }

            const unitPrice = Number(product.price);
            const subtotal = unitPrice * quantity;

            totalAmount += subtotal;

            verifiedItems.push({
                product_id: productId,
                quantity,
                unit_price: unitPrice,
                subtotal
            });
        }

        const [orderResult] = await connection.execute(
            `INSERT INTO orders
                (customer_id, user_id, total_amount, order_status)
             VALUES (?, ?, ?, 'completed')`,
            [
                customer_id || null,
                userId,
                totalAmount
            ]
        );

        const orderId = orderResult.insertId;

        for (const item of verifiedItems) {
            await connection.execute(
                `INSERT INTO order_items
                    (order_id, product_id, quantity, unit_price, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    item.subtotal
                ]
            );

            await connection.execute(
                `UPDATE products
                 SET stock_quantity = stock_quantity - ?
                 WHERE product_id = ?`,
                [item.quantity, item.product_id]
            );
        }

        await connection.execute(
            `INSERT INTO payments
                (order_id, amount, payment_method, payment_status)
             VALUES (?, ?, ?, 'completed')`,
            [
                orderId,
                totalAmount,
                payment_method
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Order created successfully.",
            order_id: orderId,
            total_amount: totalAmount
        });

    } catch (error) {
        await connection.rollback();
        handleError(res, error, error.message || "Could not create order.");
    } finally {
        connection.release();
    }
});

/* ==========================================
   UPDATE ORDER STATUS
========================================== */

app.put("/api/orders/:id/status", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { order_status } = req.body;

        const allowedStatuses = [
            "pending",
            "completed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(order_status)) {
            connection.release();

            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        await connection.beginTransaction();

        const [orders] = await connection.execute(
            `SELECT order_id, order_status
             FROM orders
             WHERE order_id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (!orders.length) {
            throw new Error("Order not found.");
        }

        const oldStatus = orders[0].order_status;

        if (oldStatus === "cancelled" && order_status !== "cancelled") {
            throw new Error("A cancelled order cannot be reopened.");
        }

        if (oldStatus !== "cancelled" && order_status === "cancelled") {
            const [items] = await connection.execute(
                `SELECT product_id, quantity
                 FROM order_items
                 WHERE order_id = ?`,
                [req.params.id]
            );

            for (const item of items) {
                await connection.execute(
                    `UPDATE products
                     SET stock_quantity = stock_quantity + ?
                     WHERE product_id = ?`,
                    [item.quantity, item.product_id]
                );
            }

            await connection.execute(
                `UPDATE payments
                 SET payment_status = 'failed'
                 WHERE order_id = ? AND payment_status = 'completed'`,
                [req.params.id]
            );
        }

        await connection.execute(
            `UPDATE orders
             SET order_status = ?
             WHERE order_id = ?`,
            [order_status, req.params.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Order status updated successfully."
        });

    } catch (error) {
        await connection.rollback();
        handleError(res, error, error.message || "Could not update order.");
    } finally {
        connection.release();
    }
});

/* ==========================================
   PAYMENTS
========================================== */

app.get("/api/payments", async (req, res) => {
    try {
        const payments = await query(`
            SELECT
                p.payment_id,
                p.order_id,
                p.amount,
                p.payment_method,
                p.payment_status,
                p.payment_date
            FROM payments p
            ORDER BY p.payment_id DESC
        `);

        res.json(payments);
    } catch (error) {
        handleError(res, error, "Could not load payments.");
    }
});

app.put("/api/payments/:id/status", async (req, res) => {
    try {
        const { payment_status } = req.body;

        const allowedStatuses = [
            "pending",
            "completed",
            "failed"
        ];

        if (!allowedStatuses.includes(payment_status)) {
            return res.status(400).json({
                message: "Invalid payment status."
            });
        }

        const result = await query(
            `UPDATE payments
             SET payment_status = ?
             WHERE payment_id = ?`,
            [payment_status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Payment not found." });
        }

        res.json({
            success: true,
            message: "Payment status updated successfully."
        });
    } catch (error) {
        handleError(res, error, "Could not update payment.");
    }
});

/* ==========================================
   REPORTS
========================================== */

app.get("/api/reports/sales", async (req, res) => {
    try {
        const summary = await query(`
            SELECT
                COALESCE(SUM(total_amount), 0) AS totalSales,
                COUNT(*) AS totalOrders
            FROM orders
            WHERE order_status = 'completed'
        `);

        const sales = await query(`
            SELECT *
            FROM sales_report
            ORDER BY order_id DESC
        `);

        res.json({
            totalSales: Number(summary[0].totalSales),
            totalOrders: Number(summary[0].totalOrders),
            sales
        });
    } catch (error) {
        handleError(res, error, "Could not load sales report.");
    }
});

app.get("/api/reports/daily-sales", async (req, res) => {
    try {
        const dailySales = await query(`
            SELECT
                DATE(order_date) AS sale_date,
                COUNT(*) AS total_orders,
                SUM(total_amount) AS total_sales
            FROM orders
            WHERE order_status = 'completed'
            GROUP BY DATE(order_date)
            ORDER BY sale_date DESC
            LIMIT 30
        `);

        res.json(dailySales);
    } catch (error) {
        handleError(res, error, "Could not load daily sales.");
    }
});

/* ==========================================
   STAFF
========================================== */

app.get("/api/staff", async (req, res) => {
    try {
        const staff = await query(`
            SELECT
                user_id,
                full_name,
                username,
                role,
                is_active,
                created_at
            FROM users
            ORDER BY user_id DESC
        `);

        res.json(staff);
    } catch (error) {
        handleError(res, error, "Could not load staff.");
    }
});

/* ==========================================
   AUTH LOGOUT
========================================== */

app.post("/api/auth/logout", (req, res) => {
    res.json({
        success: true,
        message: "Logout request received."
    });
});

/* ==========================================
   404 HANDLER
========================================== */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

app.use((error, req, res, next) => {
    console.error("Unexpected server error:", error);

    res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

/* ==========================================
   START SERVER
========================================== */

app.listen(PORT, () => {
    console.log("====================================");
    console.log(" BEANCRAFT COFFEE HOUSE SYSTEM");
    console.log("====================================");
    console.log(`Server running: http://localhost:${PORT}`);
    console.log("Database: beancraft_coffee");
});