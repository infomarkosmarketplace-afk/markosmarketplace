// choose-account.js

document.addEventListener("DOMContentLoaded", function () {

    const buyerButton = document.getElementById("buyerAccount");
    const sellerButton = document.getElementById("sellerAccount");

    // Buyer account
    if (buyerButton) {
        buyerButton.addEventListener("click", function () {

            localStorage.setItem("selectedRole", "buyer");

            window.location.href = "register.html";
        });
    }

    // Seller account
    if (sellerButton) {
        sellerButton.addEventListener("click", function () {

            localStorage.setItem("selectedRole", "seller");

            window.location.href = "register.html";
        });
    }

});