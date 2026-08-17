// =====================================================
// MARKO'S MARKETPLACE
// HOME PAGE PRODUCT LOADER
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    loadProducts();

});


// =====================================================
// LOAD PRODUCTS FROM BACKEND
// GET /products/
// =====================================================

async function loadProducts() {

    const container =
        document.getElementById("productContainer") ||
        document.getElementById("productsContainer") ||
        document.getElementById("productGrid") ||
        document.querySelector(".product-grid");

    if (!container) {

        console.error(
            "PRODUCT ERROR: Product container was not found in index.html"
        );

        return;
    }


    // Show loading message

    container.innerHTML = `
        <div class="products-loading">
            Loading products...
        </div>
    `;


    try {

        console.log("Loading products from /products/");


        const response =
            await fetch("/products/");


        console.log(
            "Products response:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `Products server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Products received:",
            data
        );


        // =================================================
        // READ PRODUCTS FROM BACKEND RESPONSE
        // =================================================

        const products =
            Array.isArray(data)
                ? data
                : Array.isArray(data.products)
                    ? data.products
                    : [];


        console.log(
            "Number of products:",
            products.length
        );


        // =================================================
        // NO PRODUCTS
        // =================================================

        if (products.length === 0) {

            container.innerHTML = `
                <div class="no-products">
                    <h3>No products available yet</h3>
                    <p>Products will appear here when sellers upload them.</p>
                </div>
            `;

            return;
        }


        // =================================================
        // DISPLAY PRODUCTS
        // =================================================

        container.innerHTML = "";


        products.forEach(product => {

            const card =
                createProductCard(product);


            container.appendChild(card);

        });


    }

    catch (error) {

        console.error(
            "PRODUCT LOADING ERROR:",
            error
        );


        container.innerHTML = `
            <div class="products-error">

                <h3>
                    Unable to load products
                </h3>

                <p>
                    Please refresh the page and try again.
                </p>

                <button
                    type="button"
                    onclick="loadProducts()"
                >
                    Retry
                </button>

            </div>
        `;

    }

}


// =====================================================
// CREATE PRODUCT CARD
// =====================================================

function createProductCard(product) {

    const card =
        document.createElement("div");


    card.className =
        "product-card";


    // =================================================
    // PRODUCT IMAGE
    // =================================================

    let image =
        "/images/default-product.png";


    try {

        let images = [];


        if (Array.isArray(product.image)) {

            images =
                product.image;

        }

        else if (
            typeof product.image === "string" &&
            product.image.trim() !== ""
        ) {

            try {

                images =
                    JSON.parse(product.image);

            }

            catch {

                images =
                    [product.image];

            }

        }


        if (
            Array.isArray(images) &&
            images.length > 0
        ) {

            let firstImage =
                images[0];


            if (
                typeof firstImage === "string"
            ) {

                if (
                    firstImage.startsWith("http://") ||
                    firstImage.startsWith("https://") ||
                    firstImage.startsWith("/")
                ) {

                    image =
                        firstImage;

                }

                else {

                    image =
                        `/uploads/${firstImage}`;

                }

            }

        }

    }

    catch (error) {

        console.error(
            "IMAGE ERROR:",
            error
        );

    }


    // =================================================
    // PRODUCT INFORMATION
    // =================================================

    const name =
        product.product_name ||
        product.title ||
        "Product";


    const price =
        Number(product.price || 0);


    const stock =
        Number(product.stock || 0);


    const category =
        product.category ||
        "Other";


    // =================================================
    // CARD
    // =================================================

    card.innerHTML = `

        <div class="product-image-wrapper">

            <img
                src="${escapeHTML(image)}"
                class="product-image"
                alt="${escapeHTML(name)}"
                onerror="
                    this.onerror=null;
                    this.src='/images/default-product.png';
                "
            >

        </div>


        <div class="product-info">

            <span class="product-category">
                ${escapeHTML(category)}
            </span>


            <h3 class="product-name">
                ${escapeHTML(name)}
            </h3>


            <div class="product-price">

                N$${price.toFixed(2)}

            </div>


            <div class="product-stock">

                ${
                    stock > 0
                        ? `In stock: ${stock}`
                        : "Out of stock"
                }

            </div>


            <div class="product-actions">

                <button
                    type="button"
                    class="view-product-btn"
                    data-product-id="${product.id}"
                >
                    View Product
                </button>


                <button
                    type="button"
                    class="add-cart-btn"
                    data-product-id="${product.id}"
                    ${stock <= 0 ? "disabled" : ""}
                >
                    Add to Cart
                </button>

            </div>

        </div>

    `;


    // =================================================
    // VIEW PRODUCT
    // =================================================

    const viewButton =
        card.querySelector(
            ".view-product-btn"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    `product.html?id=${product.id}`;

            }
        );

    }


    // =================================================
    // ADD TO CART
    // =================================================

    const cartButton =
        card.querySelector(
            ".add-cart-btn"
        );


    if (cartButton) {

        cartButton.addEventListener(
            "click",
            () => {

                addProductToCart(product);

            }
        );

    }


    return card;

}


// =====================================================
// ADD PRODUCT TO CART
// =====================================================

function addProductToCart(product) {

    let cart = [];


    try {

        cart =
            JSON.parse(
                localStorage.getItem("cart")
            ) || [];

    }

    catch {

        cart = [];

    }


    const existing =
        cart.find(
            item =>
                Number(item.product_id || item.id) ===
                Number(product.id)
        );


    if (existing) {

        existing.quantity =
            Number(existing.quantity || 1) + 1;

    }

    else {

        cart.push({

            product_id:
                product.id,

            id:
                product.id,

            product_name:
                product.product_name ||
                product.title,

            price:
                Number(product.price || 0),

            image:
                product.image,

            seller_id:
                product.seller_id,

            quantity:
                1

        });

    }


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    alert(
        "Product added to cart."
    );

}


// =====================================================
// HTML SAFETY
// =====================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================================
// MAKE FUNCTION AVAILABLE FOR RETRY BUTTON
// =====================================================

window.loadProducts =
    loadProducts;