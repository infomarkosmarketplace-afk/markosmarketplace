document.addEventListener("DOMContentLoaded", () => {

    /*
    =====================================================
    IMPORTANT
    =====================================================

    This page uses ONLY this JavaScript file.

    Do NOT load products.js, index.js or main.js
    on category.html.

    =====================================================
    */


    // ==========================================
    // ELEMENTS
    // ==========================================

    const grid =
        document.getElementById("productGrid");

    const searchInput =
        document.getElementById("searchInput");

    const searchButton =
        document.getElementById("searchButton");

    const searchDepartment =
        document.getElementById("searchDepartment");

    const sort =
        document.getElementById("sort");

    const resultCount =
        document.getElementById("resultCount");

    const cartCount =
        document.getElementById("cartCount");

    const title =
        document.getElementById("categoryTitle");

    const description =
        document.getElementById("categoryDescription");

    const breadcrumb =
        document.getElementById("breadcrumb");


    // ==========================================
    // STATE
    // ==========================================

    let allProducts = [];

    let visibleProducts = [];

    let currentPage = 1;

    const perPage = 12;


    // ==========================================
    // CATEGORY
    // ==========================================

    const params =
        new URLSearchParams(
            window.location.search
        );

    const category =
        (
            params.get("category") ||
            "all"
        ).toLowerCase();


    const categoryNames = {

        all: "All Products",

        electronics: "Electronics",

        phones: "Phones",

        computers: "Computers",

        fashion: "Fashion",

        home: "Home & Garden",

        beauty: "Beauty",

        sports: "Sports"

    };


    const categoryDescriptions = {

        all:
            "Discover products from sellers across Marko's Marketplace.",

        electronics:
            "Discover electronics, gadgets and accessories from trusted sellers.",

        phones:
            "Shop smartphones, mobile phones, cases, chargers and accessories.",

        computers:
            "Find laptops, computers, accessories and more.",

        fashion:
            "Discover clothing, shoes and fashion accessories.",

        home:
            "Shop furniture, appliances, decorations and home essentials.",

        beauty:
            "Discover beauty, skincare, haircare and personal care products.",

        sports:
            "Find sports equipment, fitness products and outdoor essentials."

    };


    const categoryName =
        categoryNames[category] ||
        "Products";


    title.textContent =
        categoryName;

    breadcrumb.textContent =
        categoryName;

    description.textContent =
        categoryDescriptions[category] ||
        `Shop ${categoryName} products on Marko's Marketplace.`;


    document.title =
        `${categoryName} - Marko's Marketplace`;


    // ==========================================
    // FETCH PRODUCTS ONCE
    // ==========================================

    async function loadProducts() {

        grid.innerHTML = `
            <div class="message">
                <h3>Loading products...</h3>
                <p>Please wait.</p>
            </div>
        `;


        try {

            const response =
                await fetch("/products", {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });


            if (!response.ok) {

                throw new Error(
                    `Server returned ${response.status}`
                );

            }


            const data =
                await response.json();


            /*
            Supports either:

            [
                {...},
                {...}
            ]

            OR:

            {
                products: [...]
            }
            */

            allProducts =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.products)
                        ? data.products
                        : [];


            visibleProducts =
                allProducts.map(normalize);


            applyFilters();


        } catch (error) {

            console.error(
                "Category products error:",
                error
            );


            grid.innerHTML = `
                <div class="message">

                    <h3>
                        Products could not be loaded
                    </h3>

                    <p>
                        Check that your server is running
                        and that GET /products works.
                    </p>

                </div>
            `;

            resultCount.textContent =
                "Unable to load products.";

        }

    }


    // ==========================================
    // NORMALIZE
    // ==========================================

    function normalize(product) {

        return {

            id:
                product.id,

            name:
                product.product_name ||
                product.name ||
                "Product",

            description:
                product.description ||
                "",

            price:
                Number(
                    product.price ||
                    product.price_local ||
                    0
                ),

            image:
                product.image ||
                "/images/placeholder.jpg",

            category:
                String(
                    product.category ||
                    ""
                ).toLowerCase(),

            seller:
                product.seller_name ||
                product.seller ||
                "Marketplace Seller",

            rating:
                Number(
                    product.rating ||
                    4
                ),

            reviews:
                Number(
                    product.reviews ||
                    0
                ),

            discount:
                Number(
                    product.discount ||
                    0
                ),

            created:
                product.created_at ||
                ""

        };

    }


    // ==========================================
    // FILTERS
    // ==========================================

    function applyFilters() {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        const department =
            searchDepartment.value;


        const rating =
            Number(
                document.querySelector(
                    'input[name="rating"]:checked'
                )?.value || 0
            );


        const price =
            document.querySelector(
                'input[name="price"]:checked'
            )?.value || "all";


        const deals =
            document.getElementById(
                "dealsOnly"
            ).checked;


        const discount =
            document.getElementById(
                "discountOnly"
            ).checked;


        visibleProducts =
            allProducts
                .map(normalize)
                .filter(product => {


                    // CATEGORY

                    const categoryMatch =

                        category === "all" ||

                        product.category
                            .includes(category);


                    // SEARCH

                    const searchMatch =

                        !search ||

                        product.name
                            .toLowerCase()
                            .includes(search) ||

                        product.description
                            .toLowerCase()
                            .includes(search);


                    // DEPARTMENT

                    const departmentMatch =

                        department === "all" ||

                        product.category
                            .includes(department);


                    // RATING

                    const ratingMatch =
                        product.rating >= rating;


                    // PRICE

                    let priceMatch = true;


                    if (price !== "all") {

                        const values =
                            price
                                .split("-")
                                .map(Number);


                        const min =
                            values[0];

                        const max =
                            values[1];


                        priceMatch =
                            product.price >= min &&
                            product.price <= max;

                    }


                    // DEALS

                    const dealsMatch =
                        !deals ||
                        product.discount > 0;


                    // DISCOUNT

                    const discountMatch =
                        !discount ||
                        product.discount > 0;


                    return (

                        categoryMatch &&

                        searchMatch &&

                        departmentMatch &&

                        ratingMatch &&

                        priceMatch &&

                        dealsMatch &&

                        discountMatch

                    );

                });


        sortProducts();

        currentPage = 1;

        render();

    }


    // ==========================================
    // SORT
    // ==========================================

    function sortProducts() {

        const value =
            sort.value;


        if (value === "low") {

            visibleProducts.sort(
                (a, b) =>
                    a.price - b.price
            );

        }


        if (value === "high") {

            visibleProducts.sort(
                (a, b) =>
                    b.price - a.price
            );

        }


        if (value === "rating") {

            visibleProducts.sort(
                (a, b) =>
                    b.rating - a.rating
            );

        }


        if (value === "newest") {

            visibleProducts.sort(
                (a, b) => {

                    return (
                        new Date(b.created || 0) -
                        new Date(a.created || 0)
                    );

                }
            );

        }

    }


    // ==========================================
    // RENDER
    // ==========================================

    function render() {

        const start =
            (currentPage - 1) *
            perPage;


        const end =
            start +
            perPage;


        const pageProducts =
            visibleProducts.slice(
                start,
                end
            );


        if (!pageProducts.length) {

            grid.innerHTML = `
                <div class="message">

                    <h3>
                        No products found
                    </h3>

                    <p>
                        Try another search or filter.
                    </p>

                </div>
            `;

        } else {

            grid.innerHTML =
                pageProducts
                    .map(createProductCard)
                    .join("");

        }


        resultCount.textContent =
            `${visibleProducts.length} product(s) found`;


        document.getElementById(
            "pageNumber"
        ).textContent =
            `Page ${currentPage}`;


        attachEvents();

    }


    // ==========================================
    // PRODUCT CARD
    // ==========================================

    function createProductCard(product) {

        const stars =
            "★".repeat(
                Math.max(
                    1,
                    Math.min(
                        5,
                        Math.round(
                            product.rating
                        )
                    )
                )
            );


        const discount =
            product.discount > 0
                ? `
                    <span class="discount">
                        ${product.discount}% OFF
                    </span>
                `
                : "";


        return `

            <article
                class="product-card"
            >

                <button
                    class="favorite"
                    data-favorite="${product.id}"
                >
                    ♡
                </button>


                <a
                    href="/product.html?id=${encodeURIComponent(product.id)}"
                >

                    <img
                        class="product-image"
                        src="${escapeHTML(product.image)}"
                        alt="${escapeHTML(product.name)}"
                        onerror="this.src='/images/placeholder.jpg';"
                    >

                </a>


                ${discount}


                <a
                    class="product-name"
                    href="/product.html?id=${encodeURIComponent(product.id)}"
                >
                    ${escapeHTML(product.name)}
                </a>


                <div class="stars">

                    ${stars}

                    <span class="review-count">
                        ${product.rating.toFixed(1)}
                        (${product.reviews})
                    </span>

                </div>


                <div class="price">

                    ${
                        product.discount > 0
                            ? `
                                <span class="old-price">
                                    N$${calculateOldPrice(
                                        product.price,
                                        product.discount
                                    )}
                                </span>
                            `
                            : ""
                    }

                    N$${product.price.toFixed(2)}

                </div>


                <div class="seller">

                    Sold by:
                    <strong>
                        ${escapeHTML(product.seller)}
                    </strong>

                </div>


                <div class="delivery">
                    🚚 Delivery available
                </div>


                <button
                    class="add-cart"
                    data-cart="${product.id}"
                >
                    Add to Cart
                </button>


                <button
                    class="buy-now"
                    data-buy="${product.id}"
                >
                    Buy Now
                </button>

            </article>

        `;

    }


    // ==========================================
    // EVENTS
    // ==========================================

    function attachEvents() {


        // CART

        document
            .querySelectorAll("[data-cart]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        addToCart(
                            button.dataset.cart
                        );

                    }
                );

            });


        // BUY NOW

        document
            .querySelectorAll("[data-buy]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        addToCart(
                            button.dataset.buy
                        );

                        window.location.href =
                            "/checkout.html";

                    }
                );

            });


        // FAVORITES

        document
            .querySelectorAll("[data-favorite]")
            .forEach(button => {

                const id =
                    String(
                        button.dataset.favorite
                    );


                if (
                    getFavorites()
                        .includes(id)
                ) {

                    button.classList.add(
                        "active"
                    );

                    button.textContent =
                        "♥";

                }


                button.addEventListener(
                    "click",
                    () => {

                        toggleFavorite(
                            id,
                            button
                        );

                    }
                );

            });

    }


    // ==========================================
    // CART
    // ==========================================

    function getCart() {

        try {

            return JSON.parse(
                localStorage.getItem("cart")
            ) || [];

        } catch {

            return [];

        }

    }


    function addToCart(id) {

        const product =
            allProducts
                .map(normalize)
                .find(
                    item =>
                        String(item.id) ===
                        String(id)
                );


        if (!product) {

            return;

        }


        const cart =
            getCart();


        const existing =
            cart.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (existing) {

            existing.quantity =
                Number(
                    existing.quantity || 1
                ) + 1;

        } else {

            cart.push({

                id: product.id,

                name: product.name,

                price: product.price,

                image: product.image,

                seller: product.seller,

                quantity: 1

            });

        }


        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );


        updateCartCount();

    }


    function updateCartCount() {

        const cart =
            getCart();


        const count =
            cart.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.quantity || 1
                    ),
                0
            );


        cartCount.textContent =
            count;

    }


    // ==========================================
    // FAVORITES
    // ==========================================

    function getFavorites() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "favorites"
                )
            ) || [];

        } catch {

            return [];

        }

    }


    function toggleFavorite(
        id,
        button
    ) {

        let favorites =
            getFavorites();


        if (
            favorites.includes(id)
        ) {

            favorites =
                favorites.filter(
                    item =>
                        item !== id
                );

            button.textContent =
                "♡";

            button.classList.remove(
                "active"
            );

        } else {

            favorites.push(id);

            button.textContent =
                "♥";

            button.classList.add(
                "active"
            );

        }


        localStorage.setItem(
            "favorites",
            JSON.stringify(
                favorites
            )
        );

    }


    // ==========================================
    // SEARCH
    // ==========================================

    searchButton.addEventListener(
        "click",
        applyFilters
    );


    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                applyFilters();

            }

        }
    );


    searchDepartment.addEventListener(
        "change",
        applyFilters
    );


    // ==========================================
    // SORT
    // ==========================================

    sort.addEventListener(
        "change",
        () => {

            sortProducts();

            currentPage = 1;

            render();

        }
    );


    // ==========================================
    // FILTER EVENTS
    // ==========================================

    document
        .querySelectorAll(
            'input[name="rating"], input[name="price"]'
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                applyFilters
            );

        });


    document
        .getElementById("dealsOnly")
        .addEventListener(
            "change",
            applyFilters
        );


    document
        .getElementById("discountOnly")
        .addEventListener(
            "change",
            applyFilters
        );


    // ==========================================
    // CLEAR FILTERS
    // ==========================================

    document
        .getElementById("clearFilters")
        .addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        "input"
                    )
                    .forEach(input => {

                        if (
                            input.type ===
                            "radio"
                        ) {

                            input.checked =
                                input.value ===
                                "all" ||
                                input.value ===
                                "0";

                        }


                        if (
                            input.type ===
                            "checkbox"
                        ) {

                            input.checked =
                                false;

                        }

                    });


                searchInput.value =
                    "";

                searchDepartment.value =
                    "all";


                applyFilters();

            }
        );


    // ==========================================
    // PAGINATION
    // ==========================================

    document
        .getElementById("next")
        .addEventListener(
            "click",
            () => {

                const pages =
                    Math.ceil(
                        visibleProducts.length /
                        perPage
                    );


                if (
                    currentPage < pages
                ) {

                    currentPage++;

                    render();

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                }

            }
        );


    document
        .getElementById("previous")
        .addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    render();

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                }

            }
        );


    // ==========================================
    // MENUS
    // ==========================================

    const sideMenu =
        document.getElementById(
            "sideMenu"
        );


    document
        .getElementById("allButton")
        .addEventListener(
            "click",
            () => {

                sideMenu.classList.add(
                    "open"
                );

            }
        );


    document
        .getElementById("menuBtn")
        .addEventListener(
            "click",
            () => {

                sideMenu.classList.add(
                    "open"
                );

            }
        );


    document
        .getElementById("closeMenu")
        .addEventListener(
            "click",
            () => {

                sideMenu.classList.remove(
                    "open"
                );

            }
        );


    // ==========================================
    // MOBILE FILTER
    // ==========================================

    document
        .getElementById("mobileFilter")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById("filters")
                    .classList.toggle(
                        "open"
                    );

            }
        );


    // ==========================================
    // HELPERS
    // ==========================================

    function calculateOldPrice(
        price,
        discount
    ) {

        if (
            !discount ||
            discount <= 0 ||
            discount >= 100
        ) {

            return price.toFixed(2);

        }


        return (
            price /
            (1 - discount / 100)
        ).toFixed(2);

    }


    function escapeHTML(value) {

        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    // ==========================================
    // START
    // ==========================================

    updateCartCount();

    loadProducts();

});