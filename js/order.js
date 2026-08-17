// ==================================
// Marko's Marketplace
// Orders Page JavaScript
// ==================================


// ================================
// Currency Rates
// USD Base Currency
// ================================

const exchangeRates = {

    NAD: 18.20,

    EUR: 0.92

};




// ================================
// Order Data Placeholder
// Backend replaces this
// ================================

let orders = [];





// ================================
// Display Price
// ================================

function displayOrderPrice(priceUSD){


    document.getElementById(
        "orderUSD"
    ).textContent =
    `$${priceUSD.toFixed(2)} USD`;



    document.getElementById(
        "orderNAD"
    ).textContent =
    `N$${(priceUSD * exchangeRates.NAD).toFixed(2)} NAD`;



    document.getElementById(
        "orderEUR"
    ).textContent =
    `€${(priceUSD * exchangeRates.EUR).toFixed(2)} EUR`;


}






// ================================
// Order Filters
// ================================


const filters =
document.querySelectorAll(".filter");



filters.forEach(filter=>{


    filter.onclick=function(){


        filters.forEach(btn=>{

            btn.classList.remove(
                "active"
            );

        });



        filter.classList.add(
            "active"
        );



        console.log(
            "Filter:",
            filter.textContent
        );


    };


});






// ================================
// View Order Details
// ================================


const viewBtn =
document.getElementById(
"viewOrderBtn"
);



if(viewBtn){


viewBtn.onclick=function(){


document.getElementById(
"orderDetails"
).style.display =
"block";


};


}






// ================================
// Close Details
// ================================


const closeBtn =
document.getElementById(
"closeDetailsBtn"
);



if(closeBtn){


closeBtn.onclick=function(){


document.getElementById(
"orderDetails"
).style.display =
"none";


};


}






// ================================
// Contact Seller
// ================================


const contactBtn =
document.getElementById(
"contactSellerBtn"
);



if(contactBtn){


contactBtn.onclick=function(){


alert(
"Seller contact page will open."
);


};


}






// ================================
// Cancel Order
// ================================


const cancelBtn =
document.getElementById(
"cancelOrderBtn"
);



if(cancelBtn){


cancelBtn.onclick=function(){


let confirmCancel =
confirm(
"Are you sure you want to cancel this order?"
);



if(confirmCancel){


alert(
"Order cancellation request sent."
);


}


};


}






// ================================
// Load Orders
// ================================


function loadOrders(){


const list =
document.getElementById(
"ordersList"
);



if(orders.length === 0){


document.getElementById(
"emptyOrders"
).style.display =
"block";


return;


}



document.getElementById(
"emptyOrders"
).style.display =
"none";



}







// Start

loadOrders();