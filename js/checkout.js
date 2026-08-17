let cart = JSON.parse(localStorage.getItem("cart")) || [];

let total = 0;

/* =====================================================
LOAD CHECKOUT
===================================================== */

function loadCheckout(){

const box =
    document.getElementById("cartItems");

if(!box){
    return;
}

box.innerHTML = "";

total = 0;


cart.forEach(item => {

    const price =
        Number(item.price) || 0;

    const quantity =
        Math.max(
            1,
            Number(item.quantity) || 1
        );

    const itemTotal =
        price * quantity;

    total += itemTotal;


    box.innerHTML += `

        <div class="product">

            <div class="product-image">

                <img
                    src="${item.image || 'images/placeholder.png'}"
                    alt="${escapeHTML(item.name || 'Product')}"
                >

            </div>


            <div>

                <div class="product-name">
                    ${escapeHTML(item.name || "Product")}
                </div>

                <div class="product-description">

                    ${escapeHTML(
                        item.description ||
                        "Marketplace product"
                    )}

                </div>

                <span class="product-quantity">

                    Quantity: ${quantity}

                </span>


                <div class="product-currencies">

                    <span class="product-currency">

                        ${item.currency || "USD"}
                        ${price.toFixed(2)}

                    </span>

                </div>

            </div>


            <div class="product-total">

                ${(item.currency || "USD")}
                ${itemTotal.toFixed(2)}

            </div>

        </div>

    `;

});


updateCheckoutTotal();

}

/* =====================================================
UPDATE TOTAL
===================================================== */

function updateCheckoutTotal(){

const totalElement =
    document.getElementById(
        "totalAmount"
    );


if(totalElement){

    totalElement.innerText =
        `$${total.toFixed(2)}`;

}


const usdElement =
    document.getElementById(
        "totalUSD"
    );

if(usdElement){

    usdElement.innerText =
        `$${total.toFixed(2)}`;

}


const nadElement =
    document.getElementById(
        "totalNAD"
    );

if(nadElement){

    nadElement.innerText =
        `N$${(total * 18.20).toFixed(2)}`;

}


const eurElement =
    document.getElementById(
        "totalEUR"
    );

if(eurElement){

    eurElement.innerText =
        `€${(total * 0.86).toFixed(2)}`;

}


const itemCount =
    document.getElementById(
        "itemCount"
    );


if(itemCount){

    let count = 0;

    cart.forEach(item => {

        count +=
            Math.max(
                1,
                Number(item.quantity) || 1
            );

    });

    itemCount.innerText = count;

}

}

/* =====================================================
CREATE ORDER
===================================================== */

async function createOrder(){

if(!cart.length){

    alert(
        "Your cart is empty."
    );

    return;

}


const token =
    localStorage.getItem("token");


if(!token){

    alert(
        "Please log in before placing your order."
    );

    window.location.href =
        "login.html";

    return;

}


const button =
    document.getElementById(
        "payButton"
    );


if(button){

    button.disabled = true;

    button.innerText =
        "Creating Order...";

}


try{


    /*
    =================================================
    IMPORTANT

    We no longer read:

        document.getElementById("currency")

    because the new checkout page does not use
    a currency selector.

    MarketHub continues using USD as its base
    currency.
    =================================================
    */


    const response =
        await fetch(
            "/orders/create",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token

                },

                body: JSON.stringify({

                    items: cart,

                    total_amount: total,

                    currency: "USD"

                })

            }
        );


    const data =
        await response.json();


    if(!response.ok){

        throw new Error(
            data.message ||
            "Order creation failed."
        );

    }


    if(!data.success){

        throw new Error(
            data.message ||
            "Order creation failed."
        );

    }


    /*
    =================================================
    SAVE ORDER ID
    =================================================
    */

    localStorage.setItem(
        "order_id",
        data.order_id
    );


    /*
    =================================================
    SAVE ORDER INFORMATION

    This allows the next payment page to know
    which order the buyer is paying for.
    =================================================
    */

    const orderData = {

        order_id:
            data.order_id,

        total_amount:
            total,

        currency:
            "USD",

        items:
            cart

    };


    /*
    If the backend already returns seller payment
    information, preserve it.

    We will connect this to the seller database
    properly in the next backend step.
    */

    if(data.seller_payment){

        orderData.seller_payment =
            data.seller_payment;

    }


    if(data.sellers){

        orderData.sellers =
            data.sellers;

    }


    localStorage.setItem(
        "current_order",
        JSON.stringify(orderData)
    );


    /*
    =================================================
    REDIRECT

    The old bank-transfer page will now be changed
    into the SELLER PAYMENT page.

    It must NOT display MarketHub's bank account.
    =================================================
    */

    window.location.href =
        "bank-transfer.html";


}
catch(error){

    console.error(
        "CREATE ORDER ERROR:",
        error
    );


    alert(
        error.message ||
        "Unable to create your order."
    );


    if(button){

        button.disabled = false;

        button.innerText =
            "🛒 Place Order & View Payment Details";

    }

}

}

/* =====================================================
HTML ESCAPE
===================================================== */

function escapeHTML(value){

return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}

/* =====================================================
INITIALIZE
===================================================== */

loadCheckout();