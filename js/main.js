// ================================
// Marko's Marketplace - main.js
// Part 1
// ================================

console.log("Marko's Marketplace Loaded");

// -------------------------
// Products
// -------------------------

const products = [
    {
        id: 1,
        name: "Gaming Laptop",
        category: "computers",
        price: 1200,
        description: "High-performance gaming laptop.",
        location: "Windhoek",
        seller: "Marko",
        image: "images/laptop.jpg"
    },
    {
        id: 2,
        name: "iPhone",
        category: "phones",
        price: 900,
        description: "Latest iPhone model.",
        location: "Windhoek",
        seller: "John",
        image: "images/iphone.jpg"
    },
    {
        id: 3,
        name: "Running Shoes",
        category: "shoes",
        price: 80,
        description: "Comfortable sports shoes.",
        location: "Swakopmund",
        seller: "Peter",
        image: "images/shoes.jpg"
    },
    {
        id: 4,
        name: "Football",
        category: "sports",
        price: 25,
        description: "Professional football.",
        location: "Walvis Bay",
        seller: "David",
        image: "images/football.jpg"
    },
    {
        id: 5,
        name: "Smart TV",
        category: "electronics",
        price: 500,
        description: "50-inch Smart TV.",
        location: "Windhoek",
        seller: "Sarah",
        image: "images/tv.jpg"
    },
    {
        id: 6,
        name: "Office Chair",
        category: "home",
        price: 150,
        description: "Comfortable office chair.",
        location: "Windhoek",
        seller: "Marko",
        image: "images/chair.jpg"
    }
];

// -------------------------
// Shopping Cart
// -------------------------

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
    const cartCount = document.getElementById("cart-count");

    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

function addToCart(product) {
    cart.push(product);
    saveCart();
    updateCartCount();

    if (typeof showToast === "function") {
        showToast(product.name + " added to cart!");
    } else {
        alert(product.name + " added to cart!");
    }
}

// -------------------------
// Categories
// -------------------------

function loadCategories() {

    const categorySelect = document.getElementById("categorySelect");

    if (!categorySelect) return;

    const categories = [
        "all",
        ...new Set(products.map(product => product.category))
    ];

    categorySelect.innerHTML = "";

    categories.forEach(category => {

        const option = document.createElement("option");

        option.value = category;

        option.textContent =
            category.charAt(0).toUpperCase() +
            category.slice(1);

        categorySelect.appendChild(option);

    });

}

// -------------------------
// Display Products
// -------------------------

function displayProducts(productList) {

    const container = document.getElementById("products");

    if (!container) return;

    container.innerHTML = "";

    if (productList.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
    }

    productList.forEach(product => {

        const card = document.createElement("div");

        card.className = "product-card";

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p><strong>Category:</strong> ${product.category}</p>
            <p><strong>Price:</strong> $${product.price}</p>
            <p><strong>Location:</strong> ${product.location}</p>
            <p><strong>Seller:</strong> ${product.seller}</p>

            <button class="buy-btn" data-id="${product.id}">
                Buy Now
            </button>
        `;

        container.appendChild(card);

    });

    addButtonEvents();

}

// ================================
// Marko's Marketplace - main.js
// Part 2
// ================================

// -------------------------
// Search & Filter
// -------------------------

function filterProducts(searchText = "", category = "all") {

    const filtered = products.filter(product => {

        const matchesSearch =
            product.name.toLowerCase().includes(searchText.toLowerCase()) ||
            product.description.toLowerCase().includes(searchText.toLowerCase());

        const matchesCategory =
            category === "all" ||
            product.category === category;

        return matchesSearch && matchesCategory;

    });

    displayProducts(filtered);

}

// -------------------------
// Search Input
// -------------------------

const searchInput = document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener("input", function () {

        const category =
            document.getElementById("categorySelect").value;

        filterProducts(this.value, category);

    });

}

// -------------------------
// Category Select
// -------------------------

const categorySelect = document.getElementById("categorySelect");

if (categorySelect) {

    categorySelect.addEventListener("change", function () {

        const search =
            document.getElementById("searchInput").value;

        filterProducts(search, this.value);

    });

}

// -------------------------
// Toast Notification
// -------------------------

function showToast(message) {

    const toast = document.createElement("div");

    toast.className = "toast";

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 2500);

}

// -------------------------
// Buy Button Events
// -------------------------

function addButtonEvents() {

    const buttons = document.querySelectorAll(".buy-btn");

    buttons.forEach(button => {

        button.addEventListener("click", function () {

            const id = Number(this.dataset.id);

            const product = products.find(p => p.id === id);

            if (!product) return;

            this.disabled = true;
            this.textContent = "Adding...";

            setTimeout(() => {

                addToCart(product);

                this.disabled = false;
                this.textContent = "Buy Now";

            }, 500);

        });

    });

}

// -------------------------
// Dark Mode
// -------------------------

const darkModeBtn = document.getElementById("darkModeBtn");

if (darkModeBtn) {

    darkModeBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

    });

}

// -------------------------
// Navigation Links
// -------------------------

document.querySelectorAll("nav a").forEach(link => {

    link.addEventListener("click", function (e) {

        e.preventDefault();

        showToast(this.textContent + " page coming soon!");

    });

});

// -------------------------
// Page Load
// -------------------------

document.addEventListener("DOMContentLoaded", () => {

    updateCartCount();

    loadCategories();

    displayProducts(products);

});

// ================================
// Marko's Marketplace - main.js
// Part 3
// ================================

// -------------------------
// Image Upload & Preview
// -------------------------

const imageInput = document.getElementById("productImages");
const imagePreview = document.getElementById("imagePreview");

let selectedFiles = [];
let coverIndex = 0;

if (imageInput && imagePreview) {

    imageInput.addEventListener("change", function () {

        selectedFiles = Array.from(this.files);

        if (selectedFiles.length > 20) {
            alert("You can upload a maximum of 20 images.");
            this.value = "";
            selectedFiles = [];
            imagePreview.innerHTML = "";
            return;
        }

        renderImagePreview();

    });

}

// -------------------------
// Render Image Preview
// -------------------------

function renderImagePreview() {

    imagePreview.innerHTML = "";

    selectedFiles.forEach((file, index) => {

        const reader = new FileReader();

        reader.onload = function (e) {

            const container = document.createElement("div");
            container.className = "preview-item";

            container.style.position = "relative";
            container.style.display = "inline-block";
            container.style.margin = "10px";

            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.width = "120px";
            img.style.height = "120px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "8px";
            img.style.cursor = "pointer";

            // Cover badge
            if (index === coverIndex) {

                const badge = document.createElement("div");

                badge.textContent = "Cover";

                badge.style.position = "absolute";
                badge.style.bottom = "5px";
                badge.style.left = "5px";
                badge.style.background = "green";
                badge.style.color = "white";
                badge.style.padding = "2px 6px";
                badge.style.borderRadius = "4px";
                badge.style.fontSize = "12px";

                container.appendChild(badge);

            }

            // Select Cover
            img.addEventListener("click", () => {

                coverIndex = index;

                renderImagePreview();

                showToast("Cover image selected");

            });

            // Remove Button
            const removeBtn = document.createElement("button");

            removeBtn.textContent = "✖";

            removeBtn.style.position = "absolute";
            removeBtn.style.top = "5px";
            removeBtn.style.right = "5px";
            removeBtn.style.cursor = "pointer";

            removeBtn.addEventListener("click", () => {

                selectedFiles.splice(index, 1);

                if (coverIndex >= selectedFiles.length) {
                    coverIndex = 0;
                }

                renderImagePreview();

                showToast("Image removed");

            });

            container.appendChild(img);
            container.appendChild(removeBtn);

            imagePreview.appendChild(container);

        };

        reader.readAsDataURL(file);

    });

}

// -------------------------
// Loading Helper
// -------------------------

function setLoading(container, loading) {

    if (!container) return;

    if (loading) {

        container.innerHTML = "<p>Loading products...</p>";

    }

}

// -------------------------
// Reset Upload Form
// -------------------------

function resetImageUpload() {

    selectedFiles = [];
    coverIndex = 0;

    if (imageInput) imageInput.value = "";

    if (imagePreview) imagePreview.innerHTML = "";

}

// -------------------------
// Utility Functions
// -------------------------

function formatPrice(price) {

    return "$" + Number(price).toLocaleString();

}

function getCart() {

    return JSON.parse(localStorage.getItem("cart")) || [];

}

function clearCart() {

    localStorage.removeItem("cart");

    cart = [];

    updateCartCount();

    showToast("Cart cleared");

}

// -------------------------
// Console Message
// -------------------------

console.log("Marko's Marketplace loaded successfully.");

paypal.Buttons({
  createOrder: function(data, actions) {
    return actions.order.create({
      purchase_units: [{
        amount: { value: '10.00' }
      }]
    });
  },

  onApprove: function(data, actions) {
    return actions.order.capture().then(function(details) {
      alert('Payment completed by ' + details.payer.name.given_name);
    });
  }
}).render('#paypal-button-container');