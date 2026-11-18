
async function connectBackend() {
    try {
        const response = await fetch('/api/products');

        const products = await response.json();

        console.log('Products received from backend:', products);

    } catch (error) {
        console.log('Backend connection failed:', error);
    }
   }

    connectBackend();





 const products = [                                               
    { id: 1, name: "Ethiopian Coffee", price: 30, icon: "☕" },
    { id: 2, name: "Macchiato", price: 60, icon: "🥛" },
    { id: 3, name: "Tea", price: 20, icon: "🍵" },
    { id: 4, name: "Espress", price: 30, icon: "☕" },
    { id: 5, name: "Cappuccino", price: 130, icon: "🥤" },
    { id: 6, name: "Fresh Juice", price: 120, icon: "🧃" },
    { id: 7, name: "Bread", price: 25, icon: "🍞" },
    { id: 8, name: "Cake", price: 100, icon: "🍰" }
];

let cart = [];
let sales = [];
let nextReceiptNumber = 1;

const money = amount =>
    amount.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

function getTotal() {
    return cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
}


function displayDate() {
    document.getElementById("current-date").textContent =
        new Date().toLocaleString();
}


function displayMenu() {
    const menuGrid = document.getElementById("menu-grid");

    menuGrid.innerHTML = products.map(product => `
        <article class="product-card">
            <span class="product-icon">${product.icon}</span>
            <h3>${product.name}</h3>
            <p class="price">${money(product.price)} Birr</p>
            <button type="button" data-product-id="${product.id}">
                Add to Order
            </button>
        </article>
    `).join("");
}


function addToCart(productId) {
    const product = products.find(item => item.id === productId);

    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    displayCart();
}


function changeQuantity(productId, amount) {
    const item = cart.find(product => product.id === productId);

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(product => product.id !== productId);
    }

    displayCart();
}


function removeItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    displayCart();
}


function displayCart() {
    const cartItems = document.getElementById("cart-items");

    if (cart.length === 0) {
        cartItems.innerHTML =
            '<p class="empty">No items in the order yet.</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-row">
                <div>
                    <p><strong>${item.name}</strong></p>
                    <p>${money(item.price)} Birr each</p>
                    <p>Subtotal: ${money(item.price * item.quantity)} Birr</p>
                </div>

                <div class="quantity-controls">
                    <button type="button"
                        data-action="decrease"
                        data-id="${item.id}"
                        aria-label="Decrease ${item.name} quantity">
                        −
                    </button>

                    <strong>${item.quantity}</strong>

                    <button type="button"
                        data-action="increase"
                        data-id="${item.id}"
                        aria-label="Increase ${item.name} quantity">
                        +
                    </button>

                    <button type="button"
                        class="remove-btn"
                        data-action="remove"
                        data-id="${item.id}">
                        Remove
                    </button>
                </div>
            </div>
        `).join("");
    }

    document.getElementById("order-total").textContent =
        money(getTotal());

    updateChange();
}


function updateChange() {
    const total = getTotal();
    const paymentInput = document.getElementById("payment");
    const payment = Number(paymentInput.value);
    const message = document.getElementById("payment-message");

    const validPayment =
        paymentInput.value.trim() !== "" &&
        Number.isFinite(payment) &&
        payment >= 0;

    document.getElementById("change").textContent =
        money(validPayment ? Math.max(0, payment - total) : 0);

    if (cart.length === 0) {
        message.textContent = "";
    } else if (!validPayment) {
        message.textContent = "Enter the amount received.";
    } else if (payment < total) {
        message.textContent =
            "Insufficient payment. Remaining: " +
            money(total - payment) + " Birr.";
    } else {
        message.textContent = "Payment is sufficient.";
    }
}


function completeSale() {
    if (cart.length === 0) {
        alert("Please add products to the order first.");
        return;
    }

    const paymentInput = document.getElementById("payment");
    const payment = Number(paymentInput.value);
    const total = getTotal();

    if (
        paymentInput.value.trim() === "" ||
        !Number.isFinite(payment) ||
        payment < total
    ) {
        alert("Enter a valid payment equal to or greater than the total.");
        return;
    }

    const sale = {
        receiptNumber: nextReceiptNumber++,
        customer:
            document.getElementById("customer-name").value.trim() ||
            "Walk-in Customer",
        items: cart.map(item => ({ ...item })),
        total: total,
        payment: payment,
        change: payment - total,
        date: new Date()
    };

    sales.push(sale);

    displayReceipt(sale);
    displaySales();

    cart = [];
    document.getElementById("customer-name").value = "";
    paymentInput.value = "";

    displayCart();

    document.getElementById("receipt-section").hidden = false;
    document.getElementById("receipt-section").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function displayReceipt(sale) {
    const receipt = document.getElementById("receipt");

    const itemRows = sale.items.map(item => `
        <tr>
            <td>${item.name} × ${item.quantity}</td>
            <td>${money(item.price * item.quantity)} Birr</td>
        </tr>
    `).join("");

    receipt.innerHTML = `
        <h2>☕ Jimma Coffee House</h2>
        <p>Jimma Town, Oromia, Ethiopia</p>
        <hr>

        <p>Receipt No: ${sale.receiptNumber}</p>
        <p>Customer: ${sale.customer}</p>
        <p>Date: ${sale.date.toLocaleString()}</p>

        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>

        <h3>Total: ${money(sale.total)} Birr</h3>
        <p>Paid: ${money(sale.payment)} Birr</p>
        <p>Change: ${money(sale.change)} Birr</p>

        <hr>
        <p>Thank you for visiting Jimma Coffee House!</p>
    `;
}


function displaySales() {
    const today = new Date();

    const todaySales = sales.filter(sale =>
        sale.date.toDateString() === today.toDateString()
    );

    const totalSales = todaySales.reduce(
        (sum, sale) => sum + sale.total,
        0
    );

    document.getElementById("sales-count").textContent =
        todaySales.length;

    document.getElementById("sales-total").textContent =
        money(totalSales);

    const history = document.getElementById("sales-history");

    if (todaySales.length === 0) {
        history.innerHTML = `
            <tr>
                <td colspan="4">No sales recorded yet.</td>
            </tr>
        `;
        return;
    }

    history.innerHTML = [...todaySales].reverse().map(sale => `
        <tr>
            <td>${sale.receiptNumber}</td>
            <td>${sale.customer}</td>
            <td>${sale.date.toLocaleTimeString()}</td>
            <td>${money(sale.total)}</td>
        </tr>
    `).join("");
}

// Menu button events.
document.getElementById("menu-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-product-id]");

    if (button) {
        addToCart(Number(button.dataset.productId));
    }
});

// Cart button events.
document.getElementById("cart-items").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const productId = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "increase") {
        changeQuantity(productId, 1);
    } else if (action === "decrease") {
        changeQuantity(productId, -1);
    } else if (action === "remove") {
        removeItem(productId);
    }
});

// Payment and order buttons.
document.getElementById("payment").addEventListener(
    "input",
    updateChange
);

document.getElementById("complete-btn").addEventListener(
    "click",
    completeSale
);

document.getElementById("clear-btn").addEventListener("click", () => {
    cart = [];

    document.getElementById("customer-name").value = "";
    document.getElementById("payment").value = "";

    displayCart();
});

document.getElementById("print-btn").addEventListener("click", () => {
    window.print();
});


displayDate();
displayMenu();
displayCart();
displaySales();


displayDate();

displayMenu();

displayCart();


displaySales();

