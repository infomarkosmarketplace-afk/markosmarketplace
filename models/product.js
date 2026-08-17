// products.js

let products = [];

function displayProducts() {
    const productContainer = document.getElementById("products");

    if (!productContainer) return;

    if (products.length === 0) {
        productContainer.innerHTML =
            "<p>No products available yet.</p>";
        return;
    }

    productContainer.innerHTML = products.map(product => `
        <div class="product">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
        </div>
    `).join("");
}

document.addEventListener("DOMContentLoaded", displayProducts);