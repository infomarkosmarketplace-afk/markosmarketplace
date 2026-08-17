// =====================================================
// CART
// =====================================================

let cart =
    JSON.parse(localStorage.getItem("cart")) || [];

let selectedCurrency = "USD";


// =====================================================
// DEBUG CART DATA
// =====================================================

console.log("=================================");
console.log("CURRENT CART:", cart);
console.log("=================================");

cart.forEach((item, index) => {

    console.log(
        "CART ITEM",
        index,
        {
            id: item.id,
            seller_id: item.seller_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }
    );

});


// =====================================================
// ELEMENTS
// =====================================================

const cartItems =
    document.getElementById("cartItems");

const cartTotal =
    document.getElementById("cartTotal");


// =====================================================
// DISPLAY CART
// =====================================================

function displayCart() {

    if (!cartItems || !cartTotal) {
        console.error(
            "Cart elements were not found in the HTML."
        );

        return;
    }


    cartItems.innerHTML = "";


    // =================================================
    // EMPTY CART
    // =================================================

    if (cart.length === 0) {

        cartItems.innerHTML = `

            <div class="empty-cart">

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add some products before checking out.
                </p>

            </div>

        `;

        cartTotal.innerHTML = "0";

        return;
    }


    // =================================================
    // TOTAL
    // =================================================

    let total = 0;


    // =================================================
    // PRODUCTS
    // =================================================

    cart.forEach((product, index) => {


        // ---------------------------------------------
        // PRODUCT DATA
        // ---------------------------------------------

        const productId =
            product.id;

        const sellerId =
            product.seller_id;

        const productName =
            product.name || "Product";

        const quantity =
            Math.max(
                1,
                Number(product.quantity) || 1
            );

        const price =
            Number(product.price) || 0;


        // ---------------------------------------------
        // DEBUG
        // ---------------------------------------------

        console.log(
            `Cart product ${index}:`,
            {
                id: productId,
                seller_id: sellerId,
                name: productName,
                price: price,
                quantity: quantity
            }
        );


        // ---------------------------------------------
        // WARN IF SELLER ID IS MISSING
        // ---------------------------------------------

        if (!sellerId) {

            console.warn(
                "⚠️ SELLER ID IS MISSING FOR CART ITEM:",
                product
            );

        }


        // ---------------------------------------------
        // CURRENCY
        // ---------------------------------------------

        const converted =
            convertCurrency(
                price,
                selectedCurrency
            );


        total +=
            converted * quantity;


        // ---------------------------------------------
        // CART PRODUCT
        // ---------------------------------------------

        const div =
            document.createElement("div");


        div.className =
            "cart-product";


        div.innerHTML = `

            <img
                src="${
                    product.image ||
                    "uploads/default.jpg"
                }"
                width="100"
                alt="${productName}"
            >

            <div>

                <h3>
                    ${productName}
                </h3>

                <p>
                    Price:
                    ${currencySymbol(selectedCurrency)}
                    ${converted.toFixed(2)}
                </p>

                <p>
                    Quantity:
                    ${quantity}
                </p>

                <p>
                    Seller ID:
                    ${
                        sellerId ||
                        "MISSING"
                    }
                </p>

                <button
                    onclick="removeItem(${index})"
                >
                    Remove
                </button>

            </div>

        `;


        cartItems.appendChild(div);

    });


    // =================================================
    // TOTAL DISPLAY
    // =================================================

    cartTotal.innerHTML =
        currencySymbol(selectedCurrency) +
        total.toFixed(2);

}


// =====================================================
// REMOVE ITEM
// =====================================================

function removeItem(index) {

    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }


    cart.splice(index, 1);


    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    console.log(
        "Cart after removing item:",
        cart
    );


    displayCart();

}


// =====================================================
// CURRENCY SELECTOR
// =====================================================

const currencySelect =
    document.getElementById(
        "currencySelect"
    );


if (currencySelect) {

    currencySelect.addEventListener(
        "change",
        function () {

            selectedCurrency =
                this.value;

            displayCart();

        }
    );

}


// =====================================================
// CHECKOUT
// =====================================================

const checkoutBtn =
    document.getElementById(
        "checkoutBtn"
    );


if (checkoutBtn) {

    checkoutBtn.addEventListener(
        "click",
        function () {


            // -----------------------------------------
            // EMPTY CART
            // -----------------------------------------

            if (cart.length === 0) {

                alert(
                    "Your cart is empty."
                );

                return;

            }


            // -----------------------------------------
            // CHECK SELLER INFORMATION
            // -----------------------------------------

            const invalidItem =
                cart.find(
                    item =>
                        !item.id ||
                        !item.seller_id
                );


            if (invalidItem) {

                console.error(
                    "INVALID CART ITEM:",
                    invalidItem
                );


                alert(
                    "One of the products in your cart is missing seller information. Please remove it and add the product again."
                );


                return;

            }


            // -----------------------------------------
            // SAVE CHECKOUT CART
            // -----------------------------------------

            localStorage.setItem(
                "checkoutCart",
                JSON.stringify(cart)
            );


            console.log(
                "CHECKOUT CART:",
                cart
            );


            // -----------------------------------------
            // GO TO CHECKOUT
            // -----------------------------------------

            window.location.href =
                "checkout.html";

        }
    );

}


// =====================================================
// INITIALIZE
// =====================================================

displayCart();