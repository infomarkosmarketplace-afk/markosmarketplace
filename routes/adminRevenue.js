const express = require("express");
const router = express.Router();

// Admin Revenue Dashboard
router.get("/admin/revenue", (req, res) => {

    const db = req.app.locals.db;

    const sql = `
        SELECT
            (SELECT IFNULL(SUM(total_amount),0)
             FROM transactions
             WHERE status='completed') AS totalRevenue,

            (SELECT COUNT(*)
             FROM transactions
             WHERE status='completed') AS totalOrders,

            (SELECT COUNT(*)
             FROM users) AS totalUsers,

            (SELECT IFNULL(SUM(total_amount),0)
             FROM transactions
             WHERE DATE(created_at)=CURDATE()
             AND status='completed') AS todayRevenue,

            (SELECT COUNT(*)
             FROM products) AS totalProducts;
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json({
            success: true,
            dashboard: results[0]
        });

    });

});

module.exports = router;