
/* =====================================================
   BEANCRAFT COFFEE HOUSE
   Professional Management System
   Frontend JavaScript
   ===================================================== */

"use strict";

/* =====================================================
   1. CONFIGURATION
   ===================================================== */

const API_BASE_URL = "/api";

const API_ENDPOINTS = {
    dashboard: "/dashboard/summary",
    orders: "/orders",
    inventory: "/inventory/low-stock",
    popularProducts: "/products",
    logout: "/auth/logout"
};

const currencyFormatter = new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("en-ET");

/* =====================================================
   2. DOM ELEMENTS
   ===================================================== */

const elements = {
    sidebar: document.getElementById("sidebar"),
    menuToggle: document.getElementById("menuToggle"),
    currentDate: document.getElementById("currentDate"),
    currentYear: document.getElementById("currentYear"),

    logoutButton: document.getElementById("logoutButton"),
    adminName: document.getElementById("adminName"),

    statisticsFilter: document.getElementById("statisticsFilter"),

    totalSales: document.getElementById("totalSales"),
    totalOrders: document.getElementById("totalOrders"),
    totalCustomers: document.getElementById("totalCustomers"),
    totalProducts: document.getElementById("totalProducts"),

    recentOrders: document.getElementById("recentOrders"),
    inventoryList: document.getElementById("inventoryList"),
    popularProducts: document.getElementById("popularProducts")
};

/* =====================================================
   3. GENERAL HELPER FUNCTIONS
   ===================================================== */

function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return currencyFormatter.format(0);
    }

    return currencyFormatter.format(amount);
}

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return numberFormatter.format(number);
}

function setText(element, value) {
    if (!element) return;

    element.textContent = String(value ?? "");
}

function showMessage(element, message) {
    if (!element) return;

    element.textContent = message;
}

/* =====================================================
   4. DATE AND FOOTER YEAR
   ===================================================== */

function updateDate() {
    const now = new Date();

    if (elements.currentDate) {
        elements.currentDate.textContent =
            new Intl.DateTimeFormat("en", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }).format(now);
    }

    setText(elements.currentYear, now.getFullYear());
}

/* =====================================================
   5. MOBILE SIDEBAR
   ===================================================== */

function initializeSidebar() {
    const sidebar = elements.sidebar;
    const menuToggle = elements.menuToggle;

    if (!sidebar || !menuToggle) return;

    menuToggle.setAttribute("aria-expanded", "false");

    menuToggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.toggle("active");

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    document.addEventListener("click", (event) => {
        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuButton = menuToggle.contains(event.target);

        if (
            window.innerWidth <= 768 &&
            !clickedInsideSidebar &&
            !clickedMenuButton
        ) {
            sidebar.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });

    sidebar.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("active");
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });
    });
}

/* =====================================================
   6. ACTIVE NAVIGATION
   ===================================================== */

function initializeNavigation() {
    const navigationLinks = document.querySelectorAll(".nav-link");

    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            navigationLinks.forEach((item) => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });
}

/* =====================================================
   7. SECURE API REQUEST HELPER
   ===================================================== */

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        "Accept": "application/json",
        ...options.headers
    };

    // Add a CSRF token when the backend provides one.
    // The token should be rendered by the server, not stored in localStorage.
    const csrfMeta = document.querySelector(
        'meta[name="csrf-token"]'
    );

    if (csrfMeta && options.method && options.method !== "GET") {
        headers["X-CSRF-Token"] = csrfMeta.content;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin"
    });

    if (response.status === 401) {
        window.location.assign("/login.html");
        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error("The server returned an unexpected response.");
    }

    return response.json();
}

/* =====================================================
   8. DASHBOARD STATISTICS
   ===================================================== */

async function loadDashboardStatistics() {
    try {
        const period = elements.statisticsFilter?.value || "today";

        const query = new URLSearchParams({
            period
        });

        const result = await apiRequest(
            `${API_ENDPOINTS.dashboard}?${query.toString()}`
        );

        const statistics = result.data ?? result;

        setText(
            elements.totalSales,
            formatCurrency(statistics.totalSales)
        );

        setText(
            elements.totalOrders,
            formatNumber(statistics.totalOrders)
        );

        setText(
            elements.totalCustomers,
            formatNumber(statistics.totalCustomers)
        );

        setText(
            elements.totalProducts,
            formatNumber(statistics.totalProducts)
        );

    } catch (error) {
        console.error("Dashboard statistics:", error);
    }
}

/* =====================================================
   9. RECENT ORDERS
   ===================================================== */

function createTableCell(value) {
    const cell = document.createElement("td");

    // textContent prevents HTML from being interpreted as markup.
    cell.textContent = String(value ?? "—");

    return cell;
}

function createStatusCell(status) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");

    const allowedStatuses = [
        "pending",
        "preparing",
        "completed",
        "cancelled"
    ];

    const normalizedStatus = String(status || "").toLowerCase();

    badge.classList.add("status");

    if (allowedStatuses.includes(normalizedStatus)) {
        badge.classList.add(normalizedStatus);
        badge.textContent = normalizedStatus;
    } else {
        badge.textContent = "Unknown";
    }

    cell.appendChild(badge);

    return cell;
}

function renderRecentOrders(orders) {
    const container = elements.recentOrders;

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(orders) || orders.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No recent orders available.";

        row.appendChild(cell);
        container.appendChild(row);

        return;
    }

    orders.forEach((order) => {
        const row = document.createElement("tr");

        row.appendChild(
            createTableCell(order.order_number)
        );

        row.appendChild(
            createTableCell(order.customer_name)
        );

        row.appendChild(
            createTableCell(formatCurrency(order.total_amount))
        );

        row.appendChild(
            createStatusCell(order.order_status)
        );

        row.appendChild(
            createTableCell(order.created_at)
        );

        container.appendChild(row);
    });
}

async function loadRecentOrders() {
    try {
        const query = new URLSearchParams({
            limit: "5"
        });

        const result = await apiRequest(
            `${API_ENDPOINTS.orders}?${query.toString()}`
        );

        renderRecentOrders(result.data ?? result.orders ?? []);

    } catch (error) {
        console.error("Recent orders:", error);
        showMessage(
            elements.recentOrders,
            "Unable to load recent orders."
        );
    }
}

/* =====================================================
   10. INVENTORY
   ===================================================== */

function renderInventory(items) {
    const container = elements.inventoryList;

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(items) || items.length === 0) {
        showMessage(container, "No low-stock products found.");
        return;
    }

    items.forEach((item) => {
        const wrapper = document.createElement("div");
        const details = document.createElement("div");

        const name = document.createElement("h4");
        const description = document.createElement("p");
        const quantity = document.createElement("span");

        wrapper.className = "inventory-item";

        name.textContent = item.product_name || "Unnamed product";

        description.textContent =
            item.category_name || "Coffee House Inventory";

        quantity.className = "quantity";
        quantity.textContent =
            `${formatNumber(item.stock_quantity)} available`;

        details.append(name, description);
        wrapper.append(details, quantity);

        container.appendChild(wrapper);
    });
}

async function loadInventory() {
    try {
        const result = await apiRequest(API_ENDPOINTS.inventory);

        renderInventory(result.data ?? result.items ?? []);

    } catch (error) {
        console.error("Inventory:", error);

        showMessage(
            elements.inventoryList,
            "Unable to load inventory information."
        );
    }
}

/* =====================================================
   11. POPULAR PRODUCTS
   ===================================================== */

function renderPopularProducts(products) {
    const container = elements.popularProducts;

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(products) || products.length === 0) {
        showMessage(container, "No popular products available.");
        return;
    }

    products.forEach((product) => {
        const wrapper = document.createElement("div");
        const details = document.createElement("div");

        const name = document.createElement("h4");
        const price = document.createElement("p");

        wrapper.className = "product-item";

        name.textContent = product.product_name || "Unnamed product";

        price.textContent = formatCurrency(product.price);

        details.append(name, price);
        wrapper.appendChild(details);

        container.appendChild(wrapper);
    });
}

async function loadPopularProducts() {
    try {
        const result = await apiRequest(API_ENDPOINTS.popularProducts);

        renderPopularProducts(result.data ?? result.products ?? []);

    } catch (error) {
        console.error("Popular products:", error);

        showMessage(
            elements.popularProducts,
            "Unable to load popular products."
        );
    }
}

/* =====================================================
   12. STATISTICS FILTER
   ===================================================== */

function initializeStatisticsFilter() {
    if (!elements.statisticsFilter) return;

    elements.statisticsFilter.addEventListener("change", () => {
        loadDashboardStatistics();
    });
}

/* =====================================================
   13. LOGOUT
   ===================================================== */

async function logout() {
    if (!confirm("Are you sure you want to log out?")) {
        return;
    }

    if (elements.logoutButton) {
        elements.logoutButton.disabled = true;
    }

    try {
        await apiRequest(API_ENDPOINTS.logout, {
            method: "POST"
        });

        window.location.assign("/login.html");

    } catch (error) {
        console.error("Logout:", error);

        if (elements.logoutButton) {
            elements.logoutButton.disabled = false;
        }

        alert("Unable to log out. Please try again.");
    }
}

function initializeLogout() {
    if (!elements.logoutButton) return;

    elements.logoutButton.addEventListener("click", logout);
}

/* =====================================================
   14. LOAD DASHBOARD
   ===================================================== */

async function loadDashboard() {
    await Promise.allSettled([
        loadDashboardStatistics(),
        loadRecentOrders(),
        loadInventory(),
        loadPopularProducts()
    ]);
}

/* =====================================================
   15. APPLICATION INITIALIZATION
   ===================================================== */

function initializeApp() {
    updateDate();

    initializeSidebar();

    initializeNavigation();

    initializeStatisticsFilter();

    initializeLogout();

    loadDashboard();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    initializeApp();
}