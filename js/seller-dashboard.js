// =========================================================
// MARKO'S MARKETPLACE
// SELLER DASHBOARD
// =========================================================

"use strict";


// =========================================================
// AUTHENTICATION
// =========================================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
    throw new Error("Seller is not logged in.");
}


let seller;

try {

    const payload =
        JSON.parse(
            atob(token.split(".")[1])
        );

    seller = payload;

} catch (error) {

    console.error(
        "Invalid login token:",
        error
    );

    localStorage.removeItem("token");

    window.location.href =
        "/login.html";

    throw new Error(
        "Invalid authentication token."
    );
}


// =========================================================
// SELLER ACCESS ONLY
// =========================================================

if (
    !seller ||
    seller.role !== "seller"
) {

    window.location.href =
        "/index.html";

    throw new Error(
        "Seller access required."
    );
}


// =========================================================
// CURRENCY RATES
// NAD IS THE MARKETPLACE BASE CURRENCY
// =========================================================

const rates = {

    NAD: 1,

    USD: 1 / 18.20,

    EUR: 0.92 / 18.20

};


// =========================================================
// DASHBOARD DATA
// =========================================================

const dashboardData = {

    products: 0,

    orders: 0,

    revenue: 0,

    commission: 0,

    income: 0,

    wallet: 0,

    rating: 0

};


// =========================================================
// SAFE NUMBER
// =========================================================

function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;

}


// =========================================================
// FORMAT MONEY
// =========================================================

function moneyUSD(value) {

    return `$${number(value).toFixed(2)} USD`;

}


// =========================================================
// DASHBOARD TABS
// =========================================================

const tabs =
    document.querySelectorAll(
        ".dashboard-tab"
    );


const sections =
    document.querySelectorAll(
        ".dashboard-section"
    );


tabs.forEach(tab => {

    tab.addEventListener(
        "click",
        function () {

            const sectionName =
                this.dataset.section;


            tabs.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });


            sections.forEach(section => {

                section.classList.remove(
                    "active"
                );

            });


            this.classList.add(
                "active"
            );


            const section =
                document.getElementById(
                    sectionName
                );


            if (section) {

                section.classList.add(
                    "active"
                );

            }

        }
    );

});


// =========================================================
// LOAD SELLER PRODUCTS
// =========================================================

async function loadSellerProducts() {

    const container =
        document.getElementById(
            "sellerProductList"
        );


    try {

        const response =
            await fetch(
                `/products/seller/${seller.id}`,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Server error ${response.status}`
            );

        }


        const products =
            Array.isArray(data)
                ? data
                : Array.isArray(data.products)
                    ? data.products
                    : [];


        dashboardData.products =
            products.length;


        const productCount =
            document.getElementById(
                "productCount"
            );


        if (productCount) {

            productCount.textContent =
                products.length;

        }


        if (!container) {

            return;

        }


        container.innerHTML = "";


        if (products.length === 0) {

            container.innerHTML = `

                <div class="dashboard-card"
                     style="grid-column:1/-1;text-align:center;">

                    <i class="fas fa-box-open"></i>

                    <h3>
                        No products yet
                    </h3>

                    <p>
                        Upload your first product
                        to start selling.
                    </p>

                    <a
                        href="/upload.html"
                        class="add-product-btn"
                        style="margin-top:15px;"
                    >
                        <i class="fas fa-plus"></i>
                        Add Product
                    </a>

                </div>

            `;

            return;

        }


        products.forEach(product => {

            let images = [];


            try {

                if (
                    Array.isArray(
                        product.image
                    )
                ) {

                    images =
                        product.image;

                } else if (
                    typeof product.image ===
                    "string" &&
                    product.image.trim()
                ) {

                    try {

                        images =
                            JSON.parse(
                                product.image
                            );

                    } catch {

                        images = [
                            product.image
                        ];

                    }

                }

            } catch {

                images = [];

            }


            const firstImage =
                images.length > 0
                    ? images[0]
                    : null;


            let imageURL =
                "/images/default-product.png";


            if (firstImage) {

                if (
                    firstImage.startsWith(
                        "http"
                    ) ||
                    firstImage.startsWith("/")
                ) {

                    imageURL =
                        firstImage;

                } else {

                    imageURL =
                        `/uploads/${firstImage}`;

                }

            }


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            card.innerHTML = `

                <img
                    src="${imageURL}"
                    class="product-image"
                    alt="Product"
                    onerror="
                        this.src='/images/default-product.png';
                    "
                >

                <h3>
                    ${escapeHTML(
                        product.product_name ||
                        "Product"
                    )}
                </h3>

                <p>
                    ${moneyUSD(
                        product.price
                    )}
                </p>

                <p>
                    Stock:
                    ${number(product.stock)}
                </p>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        margin-top:12px;
                    "
                >

                    <button
                        type="button"
                        class="edit-product-btn"
                        data-id="${product.id}"
                    >
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>

                    <button
                        type="button"
                        class="delete-product-btn"
                        data-id="${product.id}"
                    >
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        });


        attachProductButtons();

    }

    catch (error) {

        console.error(
            "Loading seller products:",
            error
        );


        if (container) {

            container.innerHTML = `

                <div class="dashboard-card"
                     style="grid-column:1/-1;text-align:center;">

                    <i class="fas fa-triangle-exclamation"></i>

                    <h3>
                        Products could not be loaded
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => {

                const entities = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return entities[
                    character
                ];

            }
        );

}


// =========================================================
// PRODUCT BUTTONS
// =========================================================

function attachProductButtons() {

    document
        .querySelectorAll(
            ".edit-product-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const productId =
                        this.dataset.id;


                    if (!productId) {
                        return;
                    }


                    /*
                    -------------------------------------------------
                    DO NOT PRETEND THE EDIT SYSTEM EXISTS.
                    Until an edit route/page is connected, send
                    the seller to the product page instead.
                    -------------------------------------------------
                    */

                    window.location.href =
                        `/product.html?id=${encodeURIComponent(
                            productId
                        )}`;

                }
            );

        });


    document
        .querySelectorAll(
            ".delete-product-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async function () {

                    const productId =
                        this.dataset.id;


                    if (!productId) {
                        return;
                    }


                    const confirmed =
                        window.confirm(
                            "Are you sure you want to delete this product?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    /*
                    -------------------------------------------------
                    IMPORTANT

                    We do NOT call a DELETE endpoint here unless
                    your backend already has one.

                    This prevents this dashboard from breaking
                    your product system.
                    -------------------------------------------------
                    */

                    alert(
                        "The delete function is ready to connect, but the product deletion API must be confirmed before we enable it."
                    );

                }
            );

        });

}


// =========================================================
// LOAD SELLER SALES / EARNINGS
// =========================================================

async function loadSales() {

    const salesTable =
        document.getElementById(
            "salesTable"
        );


    try {

        const response =
            await fetch(
                "/income/earnings",
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Sales server error ${response.status}`
            );

        }


        const sales =
            Array.isArray(data.earnings)
                ? data.earnings
                : [];


        if (salesTable) {

            salesTable.innerHTML = "";

        }


        if (sales.length === 0) {

            if (salesTable) {

                salesTable.innerHTML = `

                    <tr>

                        <td colspan="4"
                            style="text-align:center;">

                            No sales yet.

                        </td>

                    </tr>

                `;

            }

            dashboardData.orders = 0;
            dashboardData.revenue = 0;
            dashboardData.commission = 0;
            dashboardData.income = 0;

            loadStatistics();

            return;

        }


        sales.forEach(sale => {

            const amount =
                number(
                    sale.amount
                );


            const commission =
                number(
                    sale.admin_commission
                );


            const sellerAmount =
                number(
                    sale.seller_amount
                );


            if (salesTable) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        #${escapeHTML(
                            sale.order_id
                        )}
                    </td>

                    <td>
                        Product #${escapeHTML(
                            sale.product_id
                        )}
                    </td>

                    <td>
                        ${moneyUSD(
                            amount
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.status ||
                            "Paid"
                        )}
                    </td>

                `;


                salesTable.appendChild(
                    row
                );

            }

        });


        /*
        =====================================================
        FINANCIAL CALCULATION

        Total transaction:
            100%

        MarketHub:
            30%

        Seller:
            70%

        These values are READ from the backend records.

        We do not create wallet money here.
        =====================================================
        */

        dashboardData.orders =
            sales.length;


        dashboardData.revenue =
            sales.reduce(
                (total, sale) => {

                    return total +
                        number(
                            sale.amount
                        );

                },
                0
            );


        dashboardData.commission =
            sales.reduce(
                (total, sale) => {

                    return total +
                        number(
                            sale.admin_commission
                        );

                },
                0
            );


        dashboardData.income =
            sales.reduce(
                (total, sale) => {

                    return total +
                        number(
                            sale.seller_amount
                        );

                },
                0
            );


        loadStatistics();

    }

    catch (error) {

        console.error(
            "Loading seller sales:",
            error
        );


        if (salesTable) {

            salesTable.innerHTML = `

                <tr>

                    <td colspan="4"
                        style="text-align:center;">

                        Sales information
                        could not be loaded.

                    </td>

                </tr>

            `;

        }

    }

}


// =========================================================
// LOAD SELLER WALLET
// =========================================================

async function loadWallet() {

    try {

        const response =
            await fetch(
                "/income/wallet",
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Wallet server error ${response.status}`
            );

        }


        const wallet =
            data.wallet || {};


        dashboardData.wallet =
            number(
                wallet.balance
            );


        const walletBalance =
            document.getElementById(
                "walletBalance"
            );


        const walletLocal =
            document.getElementById(
                "walletLocal"
            );


        if (walletBalance) {

            walletBalance.textContent =
                moneyUSD(
                    dashboardData.wallet
                );

        }


        if (walletLocal) {

            /*
            -------------------------------------------------
            The wallet balance is treated as the backend
            wallet currency.

            Keep the display simple until the backend confirms
            the wallet's actual currency.
            -------------------------------------------------
            */

            walletLocal.textContent =

                `N$${(
                    dashboardData.wallet /
                    rates.USD
                ).toFixed(2)} NAD | ` +

                `€${(
                    dashboardData.wallet /
                    rates.USD *
                    rates.EUR
                ).toFixed(2)} EUR`;

        }


    }

    catch (error) {

        console.error(
            "Loading seller wallet:",
            error
        );

    }

}


// =========================================================
// DASHBOARD STATISTICS
// =========================================================

function loadStatistics() {

    const productCount =
        document.getElementById(
            "productCount"
        );


    const orderCount =
        document.getElementById(
            "orderCount"
        );


    const revenue =
        document.getElementById(
            "revenue"
        );


    const sellerRating =
        document.getElementById(
            "sellerRating"
        );


    const totalSales =
        document.getElementById(
            "totalSales"
        );


    const commission =
        document.getElementById(
            "commission"
        );


    const sellerIncome =
        document.getElementById(
            "sellerIncome"
        );


    if (productCount) {

        productCount.textContent =
            dashboardData.products;

    }


    if (orderCount) {

        orderCount.textContent =
            dashboardData.orders;

    }


    if (revenue) {

        revenue.textContent =
            moneyUSD(
                dashboardData.revenue
            );

    }


    if (sellerRating) {

        sellerRating.textContent =
            number(
                dashboardData.rating
            ).toFixed(1);

    }


    if (totalSales) {

        totalSales.textContent =
            moneyUSD(
                dashboardData.revenue
            );

    }


    if (commission) {

        commission.textContent =
            moneyUSD(
                dashboardData.commission
            );

    }


    if (sellerIncome) {

        sellerIncome.textContent =
            moneyUSD(
                dashboardData.income
            );

    }

}


// =========================================================
// WITHDRAW BUTTON
// =========================================================

const withdrawBtn =
    document.getElementById(
        "withdrawBtn"
    );


if (withdrawBtn) {

    withdrawBtn.addEventListener(
        "click",
        async function () {

            const amount =
                window.prompt(
                    "Enter withdrawal amount:"
                );


            if (
                amount === null ||
                amount.trim() === ""
            ) {

                return;

            }


            const withdrawalAmount =
                Number(
                    amount
                );


            if (
                !Number.isFinite(
                    withdrawalAmount
                ) ||
                withdrawalAmount <= 0
            ) {

                alert(
                    "Please enter a valid withdrawal amount."
                );

                return;

            }


            if (
                withdrawalAmount >
                dashboardData.wallet
            ) {

                alert(
                    "The withdrawal amount is greater than your available wallet balance."
                );

                return;

            }


            try {

                withdrawBtn.disabled = true;


                const response =
                    await fetch(
                        "/income/withdraw",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify({

                                    amount:
                                        withdrawalAmount

                                })

                        }
                    );


                const data =
                    await response.json()
                        .catch(() => ({}));


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        `Withdrawal failed (${response.status})`
                    );

                }


                alert(
                    data.message ||
                    "Withdrawal request submitted successfully."
                );


                await loadWallet();

            }

            catch (error) {

                console.error(
                    "Withdrawal error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to process withdrawal."
                );

            }

            finally {

                withdrawBtn.disabled = false;

            }

        }
    );

}


// =========================================================
// TRANSACTIONS BUTTON
// =========================================================

const transactionBtn =
    document.getElementById(
        "transactionBtn"
    );


if (transactionBtn) {

    transactionBtn.addEventListener(
        "click",
        function () {

            const salesTab =
                document.querySelector(
                    '[data-section="sales"]'
                );


            if (salesTab) {

                salesTab.click();

            }

        }
    );

}


// =========================================================
// TRANSACTIONS
// =========================================================

function loadTransactions() {

    const list =
        document.getElementById(
            "transactionList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <tr>

            <td colspan="4"
                style="text-align:center;">

                Your wallet transactions
                will appear here.

            </td>

        </tr>

    `;

}


// =========================================================
// START DASHBOARD
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadSellerProducts();

        loadSales();

        loadWallet();

        loadStatistics();

        loadTransactions();

    }
);