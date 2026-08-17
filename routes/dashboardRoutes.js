const express = require("express");
const router = express.Router();

// ==============================
// Dashboard Statistics
// ==============================

router.get("/dashboard/stats", (req, res) => {

    const db = req.app.locals.db;

    const stats = {};

    db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, users) => {

        if (err) return res.status(500).json(err);

        stats.totalUsers = users[0].totalUsers;

        db.query("SELECT COUNT(*) AS totalProducts FROM products", (err, products) => {

            if (err) return res.status(500).json(err);

            stats.totalProducts = products[0].totalProducts;

            db.query("SELECT COUNT(*) AS totalOrders FROM orders", (err, orders) => {

                if (err) return res.status(500).json(err);

                stats.totalOrders = orders[0].totalOrders;

                db.query("SELECT IFNULL(SUM(total_amount),0) AS totalRevenue FROM orders", (err, revenue) => {

                    if (err) return res.status(500).json(err);

                    stats.totalRevenue = revenue[0].totalRevenue;

                    res.json(stats);

                });

            });

        });

    });

});

module.exports = router;

// ==============================
// Exchange Rates
// ==============================

router.get("/exchange-rates", (req, res) => {

    const db = req.app.locals.db;

    const sql = `
        SELECT
            currency_code,
            currency_name,
            currency_symbol,
            exchange_rate
        FROM exchange_rates
        ORDER BY currency_name ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Failed to load exchange rates."
            });
        }

        res.json(results);

    });

});

// ==============================
// Recent Activity
// ==============================

router.get("/recent-activity", (req, res) => {

    const db = req.app.locals.db;

    const sql = `
        SELECT
            title,
            activity_date AS date
        FROM recent_activity
        ORDER BY activity_date DESC
        LIMIT 10
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Failed to load recent activity."
            });
        }

        res.json(results);

    });

});

// ==============================
// Notifications
// ==============================

router.get("/notifications", (req, res) => {

    const db = req.app.locals.db;

    const sql = `
        SELECT
            id,
            title,
            message,
            created_at
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 10
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Failed to load notifications."
            });
        }

        res.json(results);

    });

});

// ==============================
// User Profile
// ==============================

router.get("/profile", (req, res) => {

    const db = req.app.locals.db;

    // Replace 1 with the logged-in user's ID later
    const userId = 1;

    const sql = `
        SELECT
            id,
            name,
            email,
            profile_image
        FROM users
        WHERE id = ?
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Failed to load profile."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json(results[0]);

    });

});

// ==============================
// Admin Dashboard
// ==============================

router.get("/admin/dashboard", (req, res) => {

    const db = req.app.locals.db;

    const dashboard = {};

    db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, users) => {

        if (err) return res.status(500).json(err);

        dashboard.totalUsers = users[0].totalUsers;

        db.query("SELECT COUNT(*) AS totalProducts FROM products", (err, products) => {

            if (err) return res.status(500).json(err);

            dashboard.totalProducts = products[0].totalProducts;

            db.query("SELECT COUNT(*) AS totalOrders FROM orders", (err, orders) => {

                if (err) return res.status(500).json(err);

                dashboard.totalOrders = orders[0].totalOrders;

                db.query("SELECT IFNULL(SUM(total_amount), 0) AS totalRevenue FROM orders", (err, revenue) => {

                    if (err) return res.status(500).json(err);

                    dashboard.totalRevenue = revenue[0].totalRevenue;

                    dashboard.isAdmin = true;

                    res.json(dashboard);

                });

            });

        });

    });

});