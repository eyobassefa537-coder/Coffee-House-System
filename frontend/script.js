"use strict";

/* ==========================================
   BEANCRAFT COFFEE HOUSE
   MANAGEMENT SYSTEM - FRONTEND
========================================== */

const API = "/api";

const $ = (id) => document.getElementById(id);

let products = [];
let categories = [];
let customers = [];
let orders = [];
let payments = [];
let inventory = [];
let orderCart = [];

/* ==========================================
   API REQUEST HANDLER
========================================== */

async function apiRequest(endpoint, options = {}) {
    const config = {
        method: options.method || "GET",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        },
        ...options
    };

    if (config.body && typeof config.body !== "string") {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API}${endpoint}`, config);

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || `Request failed (${response.status})`);
    }

    return result;
}

function getRecords(result) {
    if (Array.isArray(result)) return result;

    return (
        result.data ||
        result.products ||
        result.categories ||
        result.customers ||
        result.orders ||
        result.payments ||
        result.items ||
        []
    );
}

function showMessage(message, type = "success") {
    const notification = document.createElement("div");

    notification.textContent = message;
    notification.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        z-index:99999;
        padding:15px 22px;
        border-radius:8px;
        color:white;
        background:${type === "success" ? "#198754" : "#dc3545"};
        box-shadow:0 4px 15px rgba(0,0,0,.15);
        max-width:350px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3500);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function money(value) {
    return `${Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} ETB`;
}

function dateFormat(value) {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString();
}

function statusBadge(status) {
    const safeStatus = String(status || "unknown").toLowerCase();

    return `<span class="badge badge-${
        safeStatus === "completed" ? "success" :
        safeStatus === "pending" ? "warning" :
        "danger"
    }">${escapeHTML(safeStatus)}</span>`;
}

/* ==========================================
   NAVIGATION
========================================== */

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const page = link.dataset.page;

            if (!$(page)) return;

            document.querySelectorAll(".page-section")
                .forEach(section => section.classList.remove("active"));

            document.querySelectorAll(".nav-link")
                .forEach(item => item.classList.remove("active"));

            $(page).classList.add("active");
            link.classList.add("active");

            $("sidebar")?.classList.remove("open");

            loadPage(page);
        });
    });
}

async function loadPage(page) {
    const loaders = {
        dashboard: loadDashboard,
        orders: loadOrders,
        products: loadProducts,
        categories: loadCategories,
        customers: loadCustomers,
        inventory: loadInventory,
        payments: loadPayments,
        reports: loadReports,
        staff: loadStaff
    };

    if (loaders[page]) {
        try {
            await loaders[page]();
        } catch (error) {
            showMessage(error.message, "error");
        }
    }
}

/* ==========================================
   SIDEBAR
========================================== */

function setupSidebar() {
    $("menuToggle")?.addEventListener("click", () => {
        $("sidebar")?.classList.toggle("open");
    });

    document.addEventListener("click", event => {
        const sidebar = $("sidebar");
        const toggle = $("menuToggle");

        if (
            window.innerWidth <= 768 &&
            sidebar &&
            !sidebar.contains(event.target) &&
            !toggle?.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });
}

/* ==========================================
   DASHBOARD
========================================== */

async function loadDashboard() {
    try {
        const result = await apiRequest("/dashboard/summary");
        const data = result.data || result;

        $("totalSales").textContent = money(data.totalSales);
        $("totalOrders").textContent = Number(data.totalOrders || 0);
        $("totalCustomers").textContent = Number(data.totalCustomers || 0);
        $("totalProducts").textContent = Number(data.totalProducts || 0);

        await Promise.all([
            loadRecentOrders(),
            loadLowStock(),
            loadPopularProducts()
        ]);
    } catch (error) {
        console.error("Dashboard:", error);
        throw error;
    }
}

async function loadRecentOrders() {
    const result = await apiRequest("/orders?limit=5");
    const records = getRecords(result);

    $("recentOrders").innerHTML = records.length
        ? records.slice(0, 5).map(order => `
            <tr>
                <td>${escapeHTML(order.order_id)}</td>
                <td>${escapeHTML(order.customer_name || "Walk-in")}</td>
                <td>${dateFormat(order.order_date)}</td>
                <td>${money(order.total_amount)}</td>
                <td>${statusBadge(order.order_status)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">No orders found.</td></tr>`;
}

async function loadLowStock() {
    const result = await apiRequest("/inventory/low-stock");
    const records = getRecords(result);

    $("inventoryList").innerHTML = records.length
        ? records.map(item => `
            <div>
                <strong>${escapeHTML(item.product_name)}</strong>
                <span> — ${Number(item.stock_quantity || 0)} remaining</span>
            </div>
        `).join("")
        : "No low-stock products.";
}

async function loadPopularProducts() {
    const result = await apiRequest("/products");
    products = getRecords(result);

    $("popularProducts").innerHTML = products.length
        ? products.slice(0, 5).map(product => `
            <div>
                <strong>${escapeHTML(product.product_name)}</strong>
                <span> — ${money(product.price)}</span>
            </div>
        `).join("")
        : "No products available.";
}

/* ==========================================
   PRODUCTS
========================================== */

async function loadProducts() {
    const result = await apiRequest("/products");
    products = getRecords(result);

    $("productsTable").innerHTML = products.length
        ? products.map(product => `
            <tr>
                <td>${product.product_id}</td>
                <td>${escapeHTML(product.product_name)}</td>
                <td>${product.category_id}</td>
                <td>${money(product.price)}</td>
                <td>${Number(product.stock_quantity || 0)}</td>
                <td>${Number(product.is_available) ? "Available" : "Unavailable"}</td>
                <td>
                    <button class="action-button edit-button"
                        data-action="edit-product"
                        data-id="${product.product_id}">Edit</button>
                    <button class="action-button delete-button"
                        data-action="delete-product"
                        data-id="${product.product_id}">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No products found.</td></tr>`;

    await populateCategorySelects();
}

function openProductForm(product = null) {
    $("productForm").reset();
    $("productId").value = product?.product_id || "";
    $("productName").value = product?.product_name || "";
    $("productCategory").value = product?.category_id || "";
    $("productPrice").value = product?.price || "";
    $("productStock").value = product?.stock_quantity ?? "";

    $("productFormTitle").textContent =
        product ? "Edit Product" : "Add Product";

    $("productFormContainer").hidden = false;
}

async function saveProduct(event) {
    event.preventDefault();

    const id = $("productId").value;

    const body = {
        product_name: $("productName").value.trim(),
        category_id: Number($("productCategory").value),
        price: Number($("productPrice").value),
        stock_quantity: Number($("productStock").value),
        is_available: 1
    };

    try {
        await apiRequest(id ? `/products/${id}` : "/products", {
            method: id ? "PUT" : "POST",
            body
        });

        $("productFormContainer").hidden = true;

        showMessage("Product saved successfully.");

        await loadProducts();
        await loadDashboard();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;

    try {
        await apiRequest(`/products/${id}`, { method: "DELETE" });

        showMessage("Product deleted.");

        await loadProducts();
        await loadDashboard();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

/* ==========================================
   CATEGORIES
========================================== */

async function loadCategories() {
    const result = await apiRequest("/categories");
    categories = getRecords(result);

    $("categoriesTable").innerHTML = categories.length
        ? categories.map(category => `
            <tr>
                <td>${category.category_id}</td>
                <td>${escapeHTML(category.category_name)}</td>
                <td>${escapeHTML(category.description || "-")}</td>
                <td>
                    <button class="action-button edit-button"
                        data-action="edit-category"
                        data-id="${category.category_id}">Edit</button>
                    <button class="action-button delete-button"
                        data-action="delete-category"
                        data-id="${category.category_id}">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No categories found.</td></tr>`;
}

async function populateCategorySelects() {
    const result = await apiRequest("/categories");
    categories = getRecords(result);

    const options = categories.map(category => `
        <option value="${category.category_id}">
            ${escapeHTML(category.category_name)}
        </option>
    `).join("");

    $("productCategory").innerHTML =
        `<option value="">Select category</option>${options}`;

    $("productCategory").value = $("productId").value
        ? products.find(p => p.product_id == $("productId").value)?.category_id || ""
        : $("productCategory").value;
}

function openCategoryForm(category = null) {
    $("categoryForm").reset();

    $("categoryId").value = category?.category_id || "";
    $("categoryName").value = category?.category_name || "";
    $("categoryDescription").value = category?.description || "";

    $("categoryFormTitle").textContent =
        category ? "Edit Category" : "Add Category";

    $("categoryFormContainer").hidden = false;
}

async function saveCategory(event) {
    event.preventDefault();

    const id = $("categoryId").value;

    const body = {
        category_name: $("categoryName").value.trim(),
        description: $("categoryDescription").value.trim()
    };

    try {
        await apiRequest(id ? `/categories/${id}` : "/categories", {
            method: id ? "PUT" : "POST",
            body
        });

        $("categoryFormContainer").hidden = true;

        showMessage("Category saved successfully.");

        await loadCategories();
        await loadProducts();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

/* ==========================================
   CUSTOMERS
========================================== */

async function loadCustomers() {
    const result = await apiRequest("/customers");
    customers = getRecords(result);

    $("customersTable").innerHTML = customers.length
        ? customers.map(customer => `
            <tr>
                <td>${customer.customer_id}</td>
                <td>${escapeHTML(customer.customer_name)}</td>
                <td>${escapeHTML(customer.phone || "-")}</td>
                <td>${escapeHTML(customer.email || "-")}</td>
                <td>${dateFormat(customer.created_at)}</td>
                <td>
                    <button class="action-button edit-button"
                        data-action="edit-customer"
                        data-id="${customer.customer_id}">Edit</button>
                    <button class="action-button delete-button"
                        data-action="delete-customer"
                        data-id="${customer.customer_id}">Delete</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">No customers found.</td></tr>`;

    const options = customers.map(customer => `
        <option value="${customer.customer_id}">
            ${escapeHTML(customer.customer_name)}
        </option>
    `).join("");

    $("orderCustomer").innerHTML =
        `<option value="">Walk-in Customer</option>${options}`;
}

function openCustomerForm(customer = null) {
    $("customerForm").reset();

    $("customerId").value = customer?.customer_id || "";
    $("customerName").value = customer?.customer_name || "";
    $("customerPhone").value = customer?.phone || "";
    $("customerEmail").value = customer?.email || "";

    $("customerFormTitle").textContent =
        customer ? "Edit Customer" : "Register Customer";

    $("customerFormContainer").hidden = false;
}

async function saveCustomer(event) {
    event.preventDefault();

    const id = $("customerId").value;

    const body = {
        customer_name: $("customerName").value.trim(),
        phone: $("customerPhone").value.trim() || null,
        email: $("customerEmail").value.trim() || null
    };

    try {
        await apiRequest(id ? `/customers/${id}` : "/customers", {
            method: id ? "PUT" : "POST",
            body
        });

        $("customerFormContainer").hidden = true;

        showMessage("Customer saved successfully.");

        await loadCustomers();
        await loadDashboard();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

/* ==========================================
   ORDERS
========================================== */

async function loadOrders() {
    const result = await apiRequest("/orders");
    orders = getRecords(result);

    $("ordersTable").innerHTML = orders.length
        ? orders.map(order => `
            <tr>
                <td>${order.order_id}</td>
                <td>${escapeHTML(order.customer_name || "Walk-in")}</td>
                <td>${escapeHTML(order.cashier || "-")}</td>
                <td>${dateFormat(order.order_date)}</td>
                <td>${money(order.total_amount)}</td>
                <td>${statusBadge(order.order_status)}</td>
                <td>
                    <select data-action="order-status"
                        data-id="${order.order_id}">
                        <option value="">Change status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No orders found.</td></tr>`;

    await loadProducts();
    await loadCustomers();
}

function addOrderItem() {
    const productId = Number($("orderProduct").value);
    const quantity = Number($("orderQuantity").value);

    const product = products.find(p => p.product_id === productId);

    if (!product || quantity < 1) {
        showMessage("Select a valid product and quantity.", "error");
        return;
    }

    if (quantity > Number(product.stock_quantity)) {
        showMessage("Requested quantity exceeds available stock.", "error");
        return;
    }

    const existing = orderCart.find(item => item.product_id === productId);

    if (existing) {
        existing.quantity += quantity;
    } else {
        orderCart.push({
            product_id: productId,
            quantity,
            product_name: product.product_name,
            price: Number(product.price)
        });
    }

    renderOrderCart();
}

function renderOrderCart() {
    $("orderCart").innerHTML = orderCart.length
        ? orderCart.map(item => `
            <div>
                ${escapeHTML(item.product_name)}
                × ${item.quantity}
                = ${money(item.price * item.quantity)}
            </div>
        `).join("") +
        `<strong>Total: ${money(orderCart.reduce(
            (sum, item) => sum + item.price * item.quantity, 0
        ))}</strong>`
        : "No products added.";
}

async function saveOrder(event) {
    event.preventDefault();

    if (!orderCart.length) {
        showMessage("Add at least one product.", "error");
        return;
    }

    const body = {
        customer_id: $("orderCustomer").value
            ? Number($("orderCustomer").value)
            : null,

        items: orderCart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })),

        payment_method: $("orderPaymentMethod").value
    };

    try {
        await apiRequest("/orders", {
            method: "POST",
            body
        });

        orderCart = [];
        renderOrderCart();

        $("orderForm").reset();
        $("orderFormContainer").hidden = true;

        showMessage("Order created successfully.");

        await Promise.all([
            loadOrders(),
            loadDashboard(),
            loadInventory(),
            loadPayments()
        ]);
    } catch (error) {
        showMessage(error.message, "error");
    }
}

/* ==========================================
   INVENTORY
========================================== */

async function loadInventory() {
    const result = await apiRequest("/inventory");
    inventory = getRecords(result);

    $("fullInventoryTable").innerHTML = inventory.length
        ? inventory.map(item => `
            <tr>
                <td>${escapeHTML(item.product_name)}</td>
                <td>${money(item.price)}</td>
                <td>${Number(item.stock_quantity || 0)}</td>
                <td>${escapeHTML(item.stock_status || "-")}</td>
                <td>
                    <button class="action-button edit-button"
                        data-action="update-stock"
                        data-id="${item.product_id || ""}">
                        Update
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">No inventory found.</td></tr>`;
}

async function updateStock(id) {
    if (!id) {
        showMessage("Product ID is missing.", "error");
        return;
    }

    const quantity = prompt("Enter the new stock quantity:");

    if (quantity === null) return;

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
        showMessage("Enter a valid non-negative whole number.", "error");
        return;
    }

    try {
        await apiRequest(`/inventory/${id}`, {
            method: "PUT",
            body: { stock_quantity: Number(quantity) }
        });

        showMessage("Inventory updated.");

        await loadInventory();
        await loadProducts();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

/* ==========================================
   PAYMENTS
========================================== */

async function loadPayments() {
    const result = await apiRequest("/payments");
    payments = getRecords(result);

    $("paymentsTable").innerHTML = payments.length
        ? payments.map(payment => `
            <tr>
                <td>${payment.payment_id}</td>
                <td>${payment.order_id}</td>
                <td>${money(payment.amount)}</td>
                <td>${escapeHTML(payment.payment_method)}</td>
                <td>${statusBadge(payment.payment_status)}</td>
                <td>${dateFormat(payment.payment_date)}</td>
                <td>
                    <select data-action="payment-status"
                        data-id="${payment.payment_id}">
                        <option value="">Change status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No payments found.</td></tr>`;
}

/* ==========================================
   REPORTS
========================================== */

async function loadReports() {
    const result = await apiRequest("/reports/sales");
    const data = result.data || result;

    $("salesSummary").innerHTML = `
        <h2>${money(data.totalSales)}</h2>
        <p>Total sales</p>
    `;

    const daily = await apiRequest("/reports/daily-sales");
    const records = getRecords(daily);

    $("dailySalesTable").innerHTML = records.length
        ? records.map(row => `
            <tr>
                <td>${dateFormat(row.sale_date || row.order_date)}</td>
                <td>${Number(row.total_orders || row.order_count || 0)}</td>
                <td>${money(row.total_sales || row.total_amount)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No daily sales data.</td></tr>`;
}

/* ==========================================
   STAFF
========================================== */

async function loadStaff() {
    const result = await apiRequest("/staff");
    const records = getRecords(result);

    $("staffTable").innerHTML = records.length
        ? records.map(user => `
            <tr>
                <td>${user.user_id}</td>
                <td>${escapeHTML(user.full_name)}</td>
                <td>${escapeHTML(user.username)}</td>
                <td>${escapeHTML(user.role)}</td>
                <td>${Number(user.is_active) ? "Active" : "Inactive"}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">No staff records found.</td></tr>`;
}

/* ==========================================
   EVENT HANDLERS
========================================== */

function setupForms() {
    $("showProductForm")?.addEventListener("click", () => openProductForm());
    $("showCategoryForm")?.addEventListener("click", () => openCategoryForm());
    $("showCustomerForm")?.addEventListener("click", () => openCustomerForm());

    $("cancelProductForm")?.addEventListener("click", () => {
        $("productFormContainer").hidden = true;
    });

    $("cancelCategoryForm")?.addEventListener("click", () => {
        $("categoryFormContainer").hidden = true;
    });

    $("cancelCustomerForm")?.addEventListener("click", () => {
        $("customerFormContainer").hidden = true;
    });

    $("showOrderForm")?.addEventListener("click", async () => {
        try {
            await loadProducts();
            await loadCustomers();

            orderCart = [];
            renderOrderCart();

            $("orderFormContainer").hidden = false;
        } catch (error) {
            showMessage(error.message, "error");
        }
    });

    $("productForm")?.addEventListener("submit", saveProduct);
    $("categoryForm")?.addEventListener("submit", saveCategory);
    $("customerForm")?.addEventListener("submit", saveCustomer);
    $("orderForm")?.addEventListener("submit", saveOrder);

    $("addOrderItem")?.addEventListener("click", addOrderItem);

    $("refreshReports")?.addEventListener("click", loadReports);

    $("settingsForm")?.addEventListener("submit", event => {
        event.preventDefault();

        localStorage.setItem("beanCraftBusinessName", $("businessName").value);
        localStorage.setItem("beanCraftCurrency", $("currency").value);

        showMessage("Settings saved on this browser.");
    });

    $("logoutButton")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to log out?")) return;

        try {
            await apiRequest("/auth/logout", { method: "POST" });
            showMessage("Logout request completed.");
        } catch (error) {
            showMessage(error.message, "error");
        }
    });
}

/* ==========================================
   TABLE ACTIONS
========================================== */

document.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    try {
        if (action === "edit-product") {
            const product = products.find(p => p.product_id === id);
            if (product) openProductForm(product);
        }

        if (action === "delete-product") {
            await deleteProduct(id);
        }

        if (action === "edit-category") {
            const category = categories.find(c => c.category_id === id);
            if (category) openCategoryForm(category);
        }

        if (action === "delete-category") {
            if (!confirm("Delete this category?")) return;

            await apiRequest(`/categories/${id}`, { method: "DELETE" });

            showMessage("Category deleted.");
            await loadCategories();
        }

        if (action === "edit-customer") {
            const customer = customers.find(c => c.customer_id === id);
            if (customer) openCustomerForm(customer);
        }

        if (action === "delete-customer") {
            if (!confirm("Delete this customer?")) return;

            await apiRequest(`/customers/${id}`, { method: "DELETE" });

            showMessage("Customer deleted.");
            await loadCustomers();
        }

        if (action === "update-stock") {
            await updateStock(id);
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
});

document.addEventListener("change", async event => {
    const element = event.target;

    if (element.dataset.action === "order-status") {
        const id = element.dataset.id;
        const status = element.value;

        if (!status) return;

        try {
            await apiRequest(`/orders/${id}/status`, {
                method: "PUT",
                body: { order_status: status }
            });

            showMessage("Order status updated.");

            await loadOrders();
            await loadDashboard();
        } catch (error) {
            showMessage(error.message, "error");
        }
    }

    if (element.dataset.action === "payment-status") {
        const id = element.dataset.id;
        const status = element.value;

        if (!status) return;

        try {
            await apiRequest(`/payments/${id}/status`, {
                method: "PUT",
                body: { payment_status: status }
            });

            showMessage("Payment status updated.");

            await loadPayments();
        } catch (error) {
            showMessage(error.message, "error");
        }
    }
});

/* ==========================================
   SEARCH
========================================== */

function setupSearch() {
    $("productSearch")?.addEventListener("input", event => {
        const query = event.target.value.toLowerCase();

        document.querySelectorAll("#productsTable tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query)
                ? ""
                : "none";
        });
    });

    $("customerSearch")?.addEventListener("input", event => {
        const query = event.target.value.toLowerCase();

        document.querySelectorAll("#customersTable tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query)
                ? ""
                : "none";
        });
    });
}

/* ==========================================
   INITIALIZATION
========================================== */

async function startBeanCraft() {
    $("currentDate").textContent = new Date().toLocaleDateString(
        "en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );

    $("currentYear").textContent = new Date().getFullYear();

    $("businessName").value =
        localStorage.getItem("beanCraftBusinessName") ||
        "BeanCraft Coffee House";

    setupNavigation();
    setupSidebar();
    setupForms();
    setupSearch();

    try {
        await loadDashboard();
    } catch (error) {
        console.error("System initialization:", error);
        showMessage(
            "Dashboard could not load: " + error.message,
            "error"
        );
    }
}

document.addEventListener("DOMContentLoaded", startBeanCraft);