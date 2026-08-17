// ==================================
// Marko's Marketplace
// Seller Page JavaScript
// ==================================


// ================================
// Seller Data Placeholder
// Backend will replace this
// ================================

let seller = {

    id: null,

    name: "Seller Name",

    rating: 0,

    reviews: 0,

    products: 0,

    sales: 0,

    memberSince: "--"

};



// ================================
// Load Seller Information
// ================================

function loadSeller(){


    document.getElementById(
        "sellerName"
    ).textContent =
    seller.name;



    document.getElementById(
        "sellerRating"
    ).textContent =
    seller.rating;



    document.getElementById(
        "sellerReviews"
    ).textContent =
    `${seller.reviews} Reviews`;



    document.getElementById(
        "totalProducts"
    ).textContent =
    seller.products;



    document.getElementById(
        "totalSales"
    ).textContent =
    seller.sales;



    document.getElementById(
        "averageRating"
    ).textContent =
    seller.rating;



    document.getElementById(
        "memberSince"
    ).textContent =
    seller.memberSince;


}





// ================================
// Contact Seller
// ================================

document.getElementById(
"contactSellerBtn"
).onclick = function(){


    alert(
        "Seller contact will open here."
    );


};





// ================================
// Follow Seller
// ================================

document.getElementById(
"followSellerBtn"
).onclick = function(){


    alert(
        "You are now following this seller."
    );


};





// ================================
// Share Store
// ================================

document.getElementById(
"shareStoreBtn"
).onclick = function(){


    if(navigator.share){


        navigator.share({

            title:
            seller.name,


            url:
            window.location.href

        });


    }

    else{


        navigator.clipboard.writeText(
            window.location.href
        );


        alert(
            "Store link copied."
        );


    }


};





// ================================
// Seller Products
// ================================

function loadSellerProducts(){


    const container =
    document.getElementById(
        "sellerProducts"
    );


    container.innerHTML = "";


    // Backend will insert products here


}





// ================================
// Seller Reviews
// ================================

function loadSellerReviews(){


    const reviews =
    document.getElementById(
        "sellerReviewList"
    );


    reviews.innerHTML = "";


    // Reviews from database later


}





// ================================
// Other Sellers
// ================================

function loadOtherSellers(){


    const sellers =
    document.getElementById(
        "otherSellers"
    );


    sellers.innerHTML = "";


    // Other sellers loaded later


}





// Start

loadSeller();

loadSellerProducts();

loadSellerReviews();

loadOtherSellers();