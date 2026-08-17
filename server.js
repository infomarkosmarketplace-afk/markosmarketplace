// ================================
// 1. DOTENV
// ================================
require("dotenv").config();


// ================================
// 2. IMPORTS
// ================================
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");


// ================================
// 3. ROUTES
// ================================
const authRoutes  =
    require("./routes/authRoutes");

const productRoutes =
    require("./routes/productRoutes");

const cartRoutes =
    require("./routes/cartRoutes");

const incomeRoutes =
    require("./routes/incomeRoutes");

const profileRoutes =
    require("./routes/profileRoutes");

const adminRoutes =
    require("./routes/adminRoutes");

const sellerPayoutRoutes = 
    require("./routes/sellerPayoutRoutes");

const withdrawalRoutes =
    require("./routes/withdrawalRoutes");

const walletRoutes =
    require("./routes/walletRoutes");

const adminWithdrawalRoutes = 
    require("./routes/adminWithdrawalRoutes");

const orderRoutes = 
    require("./routes/orderRoutes");

const paymentRoutes = 
    require("./routes/paymentRoutes");

const adminPaymentRoutes = 
    require("./routes/adminPaymentRoutes");

const sellerSettingsRoutes = 
    require("./routes/sellerSettingsRoutes");


// ================================
// 4. APP INITIALIZATION
// ================================
const app = express();


// ================================
// 5. MIDDLEWARE
// ================================
app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use((req, res, next) => {
    console.log("REQUEST.",
req.method, req.url);
    next();
});


// ================================
// 6. STATIC FILES
// ================================
app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// Serve uploaded product images
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// Server payment proof receipts
app.use(
    "/payment-proofs",
    express.static(
        path.join(__dirname,
            "payment-proofs")
    )
);


// ================================
// 7. API ROUTES
// ================================

// Authentication
app.use(
    "/auth",
    authRoutes.router
);

// Products
app.use(
    "/products",
    productRoutes
);

// Shopping cart
app.use(
    "/cart",
    cartRoutes
);

// Income / seller wallet
app.use(
    "/income",
    incomeRoutes
);

// Profile
app.use(
    "/profile",
    profileRoutes
);

// Admin
app.use(
    "/admin",
    adminRoutes
);

// Seller payout accounts
app.use(
    "/seller-payout",
    sellerPayoutRoutes
);

// Withdrawal requests
// IMPORTANT:
// This connects:
// /withdrawal_request
// to withdrawalRoutes.js
app.use(
    "/withdrawal_request",
    withdrawalRoutes
);

// Seller wallet
app.use(
    "/wallet",
    walletRoutes
);

app.use(
    "/admin-withdrawals",
    adminWithdrawalRoutes
);

app.use(
    "/orders",
    orderRoutes
);

app.use(
    "/payments",
    paymentRoutes
);

app.use(
    "/admin/payments",
    adminPaymentRoutes
);

app.use(
    "/seller-settings",
    sellerSettingsRoutes
);

// ================================
// 8. BASIC TEST ROUTE
// ================================
app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "MarketHub API is working."
    });

});


// ================================
// 9. SERVER START
// ================================
const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});