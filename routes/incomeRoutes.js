const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");

// =====================================================
// DATABASE CONNECTION
// =====================================================

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "marketplace",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================================================
// TEST INCOME ROUTES
// GET /income/test
// =====================================================

router.get("/test", async (req, res) => {

    try {

        res.json({
            success: true,
            message: "Income routes working."
        });

    } catch (error) {

        console.error("Income test error:", error);

        res.status(500).json({
            success: false,
            message: "Income routes error."
        });
    }
});

// =====================================================
// PROCESS SELLER INCOME
// POST /income/process
//
// 30% = Platform
// 70% = Seller
// =====================================================

router.post("/process", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            order_id,
            seller_id,
            product_id,
            amount
        } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!order_id) {

            return res.status(400).json({
                success: false,
                message: "order_id is required."
            });
        }

        if (!seller_id) {

            return res.status(400).json({
                success: false,
                message: "seller_id is required."
            });
        }

        const saleAmount = Number(amount);

        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {

            return res.status(400).json({
                success: false,
                message: "A valid amount is required."
            });
        }

        // -------------------------------------------------
        // COMMISSION
        // -------------------------------------------------

        const platformCommission =
            saleAmount * 0.30;

        const sellerAmount =
            saleAmount * 0.70;

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();

        // -------------------------------------------------
        // CHECK IF THIS INCOME WAS ALREADY PROCESSED
        // -------------------------------------------------

        const [existing] = await connection.query(
            `
            SELECT id
            FROM seller_income
            WHERE order_id = ?
            AND seller_id = ?
            LIMIT 1
            `,
            [
                order_id,
                seller_id
            ]
        );

        if (existing.length > 0) {

            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "This seller income has already been processed."
            });
        }

        // -------------------------------------------------
        // RECORD SELLER INCOME
        // -------------------------------------------------

        await connection.query(
            `
            INSERT INTO seller_income (
                order_id,
                seller_id,
                product_id,
                gross_amount,
                platform_commission,
                seller_amount
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                order_id,
                seller_id,
                product_id || null,
                saleAmount,
                platformCommission,
                sellerAmount
            ]
        );

        // -------------------------------------------------
        // UPDATE SELLER WALLET
        // -------------------------------------------------

        await connection.query(
            `
            INSERT INTO seller_wallet (
                seller_id,
                balance,
                total_earned,
                total_withdrawn
            )
            VALUES (?, ?, ?, 0)

            ON DUPLICATE KEY UPDATE

                balance =
                    balance + VALUES(balance),

                total_earned =
                    total_earned + VALUES(total_earned)
            `,
            [
                seller_id,
                sellerAmount,
                sellerAmount
            ]
        );

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();

        res.json({
            success: true,
            message: "Seller income processed successfully.",

            breakdown: {
                gross_amount: saleAmount,
                platform_commission: platformCommission,
                seller_amount: sellerAmount
            }
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            "Seller income processing error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to process seller income."
        });

    } finally {

        connection.release();
    }
});

// =====================================================
// GET SELLER WALLET
// GET /income/wallet/:seller_id
// =====================================================

router.get("/wallet/:seller_id", async (req, res) => {

    try {

        const sellerId =
            Number(req.params.seller_id);

        if (!Number.isInteger(sellerId) || sellerId <= 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid seller ID."
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                seller_id,
                balance,
                total_earned,
                total_withdrawn
            FROM seller_wallet
            WHERE seller_id = ?
            `,
            [sellerId]
        );

        // -------------------------------------------------
        // NO WALLET YET
        // -------------------------------------------------

        if (!rows.length) {

            return res.json({
                success: true,

                wallet: {
                    seller_id: sellerId,
                    balance: 0,
                    total_earned: 0,
                    total_withdrawn: 0
                }
            });
        }

        // -------------------------------------------------
        // WALLET FOUND
        // -------------------------------------------------

        res.json({
            success: true,
            wallet: rows[0]
        });

    } catch (error) {

        console.error(
            "Wallet error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load wallet."
        });
    }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;