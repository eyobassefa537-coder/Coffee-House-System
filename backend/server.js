const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());


let products = [
    { id: 1, name: 'Ethiopian Coffee', price: 30 },
    { id: 2, name: 'Macchiato', price: 60 },
    { id: 3, name: 'Tea', price: 20 },
    { id: 4, name: 'Espresso', price: 30 },
    { id: 5, name: 'Cappuccino', price: 35 },
    { id: 6, name: 'Fresh Juice', price: 120 },
    { id: 7, name: 'Bread', price: 25 },
    { id: 8, name: 'Cake', price: 100 }
];

let orders = [];


app.use(express.static(path.join(__dirname, '../frontend')));

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Get products
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Add product
app.post('/api/products', (req, res) => {
    const { name, price } = req.body;

    if (!name || !Number.isFinite(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({ message: 'Invalid product' });
    }

    const product = {
        id: Date.now(),
        name,
        price: Number(price)
    };

    products.push(product);
    res.status(201).json(product);
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === Number(req.params.id));

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const { name, price } = req.body;

    if (!name || !Number.isFinite(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({ message: 'Invalid product' });
    }

    product.name = name;
    product.price = Number(price);

    res.json(product);
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const exists = products.some(p => p.id === id);

    if (!exists) {
        return res.status(404).json({ message: 'Product not found' });
    }

    products = products.filter(p => p.id !== id);
    res.json({ message: 'Product deleted' });
});

// Create order
app.post('/api/orders', (req, res) => {
    const { customerName, items } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Invalid order' });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
        const product = products.find(p => p.id === Number(item.productId));
        const quantity = Number(item.quantity);

        if (!product || !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid order item' });
        }

        total += product.price * quantity;

        orderItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity
        });
    }

    const order = {
        id: Date.now(),
        customerName,
        items: orderItems,
        total,
        date: new Date().toISOString()
    };

    orders.push(order);
    res.status(201).json(order);
});

// Get orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// Sales summary
app.get('/api/sales', (req, res) => {
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

    res.json({
        totalOrders: orders.length,
        totalSales
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Coffee House server running at http://localhost:${PORT}`);
});