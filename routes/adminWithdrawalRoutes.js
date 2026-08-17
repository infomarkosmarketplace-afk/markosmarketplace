// =====================================================
// ADMIN WITHDRAWAL + PAYMENT MANAGEMENT ROUTES
// =====================================================

const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");

const authenticateToken = require("../middleware/auth");

// =====================================================
// DATABASE
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
// ADMIN DASHBOARD STATISTICS
// GET /admin/dashboard
// =====================================================

router.get("/dashboard", authenticateToken, async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT

                COUNT(*) AS total_requests,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) = 'pending'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS pending_requests,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) = 'approved'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS approved_requests,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) = 'rejected'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS rejected_requests,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) = 'paid'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS paid_requests,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) = 'pending'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS pending_amount,

                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(status) IN ('approved', 'paid')
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS processed_amount

            FROM withdrawal_request
        `);

        res.json({
            success: true,
            stats: rows[0]
        });

    } catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load admin dashboard."
        });
    }
});


// =====================================================
// ALL SELLER WITHDRAWAL REQUESTS
// GET /admin/withdrawal_request
// =====================================================

router.get(
    "/withdrawal_request",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] = await db.query(`
                SELECT
                    id,
                    seller_id,
                    amount,
                    currency,
                    payout_method,
                    account_holder_name,
                    bank_name,
                    account_number,
                    routing_number,
                    sort_code,
                    iban,
                    swift_bic,
                    status,
                    admin_note,
                    created_at,
                    updated_at

                FROM withdrawal_request

                ORDER BY created_at DESC
            `);

            res.json({
                success: true,
                withdrawal_requests: rows
            });

        } catch (error) {

            console.error(
                "LOAD SELLER WITHDRAWALS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load withdrawal requests."
            });
        }
    }
);


// =====================================================
// ONE SELLER WITHDRAWAL REQUEST
// GET /admin/withdrawal_request/:id
// =====================================================

router.get(
    "/withdrawal_request/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] = await db.query(
                `
                SELECT *
                FROM withdrawal_request
                WHERE id = ?
                `,
                [req.params.id]
            );

            if (!rows.length) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Withdrawal request not found."
                });
            }

            res.json({
                success: true,
                withdrawal_request: rows[0]
            });

        } catch (error) {

            console.error(
                "GET WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load withdrawal request."
            });
        }
    }
);


// =====================================================
// APPROVE SELLER WITHDRAWAL
// =====================================================

router.put(
    "/withdrawal_request/:id/approve",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            connection = await db.getConnection();

            await connection.beginTransaction();

            // ---------------------------------------------
            // LOCK WITHDRAWAL REQUEST
            // ---------------------------------------------

            const [requestRows] =
                await connection.query(
                    `
                    SELECT *
                    FROM withdrawal_request
                    WHERE id = ?
                    FOR UPDATE
                    `,
                    [req.params.id]
                );

            if (!requestRows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Withdrawal request not found."
                });
            }

            const request =
                requestRows[0];

            // ---------------------------------------------
            // CHECK STATUS
            // ---------------------------------------------

            if (
                String(request.status).toLowerCase()
                !== "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `Request is already ${request.status}.`
                });
            }

            // ---------------------------------------------
            // CHECK SELLER ID
            // ---------------------------------------------

            const sellerId =
                Number(request.seller_id);

            if (!sellerId) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Withdrawal request has no valid seller ID."
                });
            }

            // ---------------------------------------------
            // CHECK AMOUNT
            // ---------------------------------------------

            const amount =
                Number(request.amount);

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid withdrawal amount."
                });
            }

            // ---------------------------------------------
            // LOCK SELLER WALLET
            // ---------------------------------------------

            const [walletRows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        balance,
                        total_earned,
                        total_withdrawn

                    FROM seller_wallet

                    WHERE seller_id = ?

                    FOR UPDATE
                    `,
                    [sellerId]
                );

            if (!walletRows.length) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Seller wallet not found."
                });
            }

            const wallet =
                walletRows[0];

            const balance =
                Number(wallet.balance || 0);

            // ---------------------------------------------
            // CHECK BALANCE
            // ---------------------------------------------

            if (balance < amount) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Seller wallet has insufficient funds."
                });
            }

            // ---------------------------------------------
            // DEDUCT SELLER WALLET
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE seller_wallet

                SET
                    balance = balance - ?,
                    total_withdrawn =
                        COALESCE(total_withdrawn, 0) + ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE seller_id = ?
                `,
                [
                    amount,
                    amount,
                    sellerId
                ]
            );

            // ---------------------------------------------
            // APPROVE WITHDRAWAL
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE withdrawal_request

                SET
                    status = 'approved',
                    admin_note = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
                `,
                [
                    req.body.admin_note ||
                    "Approved by administrator.",

                    req.params.id
                ]
            );

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Seller withdrawal approved successfully."
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "APPROVE SELLER WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to approve seller withdrawal."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// REJECT SELLER WITHDRAWAL
// =====================================================

router.put(
    "/withdrawal_request/:id/reject",
    authenticateToken,
    async (req, res) => {

        try {

            const [result] =
                await db.query(
                    `
                    UPDATE withdrawal_request

                    SET
                        status = 'rejected',
                        admin_note = ?,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?

                    AND LOWER(status) = 'pending'
                    `,
                    [
                        req.body.admin_note ||
                        "Rejected by administrator.",

                        req.params.id
                    ]
                );

            if (!result.affectedRows) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Request does not exist or is no longer pending."
                });
            }

            res.json({
                success: true,
                message:
                    "Seller withdrawal rejected."
            });

        } catch (error) {

            console.error(
                "REJECT SELLER WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to reject seller withdrawal."
            });
        }
    }
);


// =====================================================
// DELETE SELLER WITHDRAWAL
// =====================================================

router.delete(
    "/withdrawal_request/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const [result] =
                await db.query(
                    `
                    DELETE FROM withdrawal_request
                    WHERE id = ?
                    `,
                    [req.params.id]
                );

            if (!result.affectedRows) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Withdrawal request not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Withdrawal request deleted."
            });

        } catch (error) {

            console.error(
                "DELETE SELLER WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete withdrawal request."
            });
        }
    }
);


// =====================================================
// PENDING BUYER PAYMENTS
// =====================================================

router.get(
    "/payment/pending",
    authenticateToken,
    async (req, res) => {

        try {

            const [payments] =
                await db.query(
                    `
                    SELECT
                        p.id,
                        p.order_id,
                        p.buyer_id,
                        p.receipt_image,
                        p.status,
                        p.uploaded_at,
                        o.total_amount,
                        o.currency

                    FROM payment_proofs p

                    INNER JOIN orders o
                        ON p.order_id = o.id

                    WHERE LOWER(p.status) = 'pending'

                    ORDER BY p.uploaded_at DESC
                    `
                );

            res.json({
                success: true,
                payments
            });

        } catch (error) {

            console.error(
                "LOAD PENDING PAYMENTS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed loading payments."
            });
        }
    }
);


// =====================================================
// APPROVE BUYER PAYMENT
//
// IMPORTANT:
// order_items.seller_id is used FIRST.
// products.seller_id is ONLY a fallback.
//
// 70% -> seller wallet
// 30% -> admin wallet
// =====================================================

router.put(
    "/payment/approve/:orderId",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            const orderId =
                req.params.orderId;

            // ---------------------------------------------
            // LOCK PAYMENT PROOF
            // ---------------------------------------------

            const [paymentRows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        order_id,
                        status

                    FROM payment_proofs

                    WHERE order_id = ?

                    FOR UPDATE
                    `,
                    [orderId]
                );

            if (!paymentRows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Payment proof not found."
                });
            }

            const payment =
                paymentRows[0];

            if (
                String(payment.status).toLowerCase()
                !== "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `Payment is already ${payment.status}.`
                });
            }

            // ---------------------------------------------
            // LOCK ORDER
            // ---------------------------------------------

            const [orderRows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        buyer_id,
                        total_amount,
                        currency,
                        status

                    FROM orders

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [orderId]
                );

            if (!orderRows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found."
                });
            }

            const order =
                orderRows[0];

            // ---------------------------------------------
            // GET ORDER ITEMS
            // ---------------------------------------------

            const [items] =
                await connection.query(
                    `
                    SELECT
                        oi.id,
                        oi.order_id,
                        oi.product_id,
                        oi.seller_id,
                        oi.product_name,
                        oi.quantity,
                        oi.price,
                        p.seller_id AS product_seller_id

                    FROM order_items oi

                    LEFT JOIN products p
                        ON oi.product_id = p.id

                    WHERE oi.order_id = ?

                    FOR UPDATE
                    `,
                    [orderId]
                );

            if (!items.length) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "No order items found."
                });
            }

            let sellerTotal = 0;
            let commissionTotal = 0;

            // ---------------------------------------------
            // PROCESS EACH ORDER ITEM
            // ---------------------------------------------

            for (const item of items) {

                // =========================================
                // SELLER ID
                // =========================================

                const sellerId =
                    item.seller_id ||
                    item.product_seller_id;

                console.log(
                    "ORDER ITEM SELLER CHECK:",
                    {
                        orderItemId: item.id,
                        productId: item.product_id,
                        orderItemSellerId:
                            item.seller_id,
                        productSellerId:
                            item.product_seller_id,
                        finalSellerId:
                            sellerId
                    }
                );

                if (!sellerId) {

                    throw new Error(
                        `Seller ID is missing for order item ${item.id}. Product ID: ${item.product_id}`
                    );
                }

                // =========================================
                // ITEM TOTAL
                // =========================================

                const quantity =
                    Number(item.quantity);

                const price =
                    Number(item.price);

                if (
                    !Number.isFinite(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error(
                        `Invalid quantity for order item ${item.id}`
                    );
                }

                if (
                    !Number.isFinite(price) ||
                    price <= 0
                ) {
                    throw new Error(
                        `Invalid price for order item ${item.id}`
                    );
                }

                const itemTotal =
                    price * quantity;

                // =========================================
                // 70% SELLER
                // =========================================

                const sellerAmount =
                    Number(
                        (itemTotal * 0.70)
                            .toFixed(2)
                    );

                // =========================================
                // 30% ADMIN
                // =========================================

                const commission =
                    Number(
                        (itemTotal * 0.30)
                            .toFixed(2)
                    );

                sellerTotal +=
                    sellerAmount;

                commissionTotal +=
                    commission;

                // =========================================
                // SELLER WALLET
                //
                // IMPORTANT:
                // sellerId is used here.
                // NOT item.seller_id.
                // =========================================

                await connection.query(
                    `
                    INSERT INTO seller_wallet
                    (
                        seller_id,
                        balance,
                        total_earned,
                        total_withdrawn,
                        updated_at
                    )

                    VALUES
                    (?, ?, ?, 0, CURRENT_TIMESTAMP)

                    ON DUPLICATE KEY UPDATE

                        balance =
                            COALESCE(balance, 0)
                            + VALUES(balance),

                        total_earned =
                            COALESCE(total_earned, 0)
                            + VALUES(total_earned),

                        updated_at =
                            CURRENT_TIMESTAMP
                    `,
                    [
                        sellerId,
                        sellerAmount,
                        sellerAmount
                    ]
                );

                // =========================================
                // ADMIN WALLET
                // =========================================

                await connection.query(
                    `
                    INSERT INTO admin_wallet
                    (
                        id,
                        balance,
                        total_earned,
                        total_withdrawn,
                        updated_at
                    )

                    VALUES
                    (
                        1,
                        ?,
                        ?,
                        0,
                        CURRENT_TIMESTAMP
                    )

                    ON DUPLICATE KEY UPDATE

                        balance =
                            COALESCE(balance, 0)
                            + VALUES(balance),

                        total_earned =
                            COALESCE(total_earned, 0)
                            + VALUES(total_earned),

                        updated_at =
                            CURRENT_TIMESTAMP
                    `,
                    [
                        commission,
                        commission
                    ]
                );

                // =========================================
                // RECORD ADMIN COMMISSION
                // =========================================

                await connection.query(
                    `
                    INSERT INTO admin_revenue
                    (
                        order_item_id,
                        amount,
                        description
                    )

                    VALUES
                    (?, ?, ?)
                    `,
                    [
                        item.id,
                        commission,
                        "30% marketplace commission"
                    ]
                );
            }

            // ---------------------------------------------
            // MARK PAYMENT APPROVED
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE payment_proofs

                SET status = 'Approved'

                WHERE order_id = ?
                `,
                [orderId]
            );

            // ---------------------------------------------
            // MARK ORDER PAID
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE orders

                SET status = 'Paid'

                WHERE id = ?
                `,
                [orderId]
            );

            // ---------------------------------------------
            // COMMIT
            // ---------------------------------------------

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Payment approved successfully.",

                order_id:
                    orderId,

                seller_amount:
                    Number(
                        sellerTotal.toFixed(2)
                    ),

                marketplace_commission:
                    Number(
                        commissionTotal.toFixed(2)
                    )
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "APPROVE PAYMENT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Payment approval failed."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// ADMIN WALLET
// GET /admin/wallet
// =====================================================

router.get(
    "/wallet",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        balance,
                        total_earned,
                        total_withdrawn,
                        updated_at

                    FROM admin_wallet

                    WHERE id = 1
                    `
                );

            if (!rows.length) {

                return res.json({
                    success: true,

                    wallet: {
                        id: 1,
                        balance: 0,
                        total_earned: 0,
                        total_withdrawn: 0
                    }
                });
            }

            res.json({
                success: true,
                wallet: rows[0]
            });

        } catch (error) {

            console.error(
                "ADMIN WALLET ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load admin wallet."
            });
        }
    }
);


// =====================================================
// CREATE ADMIN WITHDRAWAL
// POST /admin/withdraw
//
// This reserves the money immediately.
// If rejected, the money is restored.
// =====================================================

router.post(
    "/withdraw",
    authenticateToken,
    async (req, res) => {

        const {
            amount,
            bank_name,
            account_name,
            account_number
        } = req.body;

        const withdrawalAmount =
            Number(amount);

        if (
            !Number.isFinite(withdrawalAmount) ||
            withdrawalAmount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Enter a valid withdrawal amount."
            });
        }

        if (
            !String(bank_name || "").trim() ||
            !String(account_name || "").trim() ||
            !String(account_number || "").trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Complete all bank details."
            });
        }

        let connection;

        try {

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            // ---------------------------------------------
            // LOCK ADMIN WALLET
            // ---------------------------------------------

            const [walletRows] =
                await connection.query(
                    `
                    SELECT
                        balance,
                        total_earned,
                        total_withdrawn

                    FROM admin_wallet

                    WHERE id = 1

                    FOR UPDATE
                    `
                );

            if (!walletRows.length) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Admin wallet not found."
                });
            }

            const balance =
                Number(
                    walletRows[0].balance || 0
                );

            if (
                withdrawalAmount >
                balance
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient admin wallet balance."
                });
            }

            // ---------------------------------------------
            // CREATE WITHDRAWAL
            // ---------------------------------------------

            await connection.query(
                `
                INSERT INTO admin_withdrawals
                (
                    amount,
                    bank_name,
                    account_name,
                    account_number,
                    status,
                    requested_at
                )

                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    'Pending',
                    CURRENT_TIMESTAMP
                )
                `,
                [
                    withdrawalAmount,
                    String(bank_name).trim(),
                    String(account_name).trim(),
                    String(account_number).trim()
                ]
            );

            // ---------------------------------------------
            // RESERVE ADMIN MONEY
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE admin_wallet

                SET
                    balance =
                        balance - ?,

                    total_withdrawn =
                        COALESCE(total_withdrawn, 0)
                        + ?,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = 1
                `,
                [
                    withdrawalAmount,
                    withdrawalAmount
                ]
            );

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Admin withdrawal request created successfully."
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "CREATE ADMIN WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Withdrawal request failed."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// ADMIN WITHDRAWAL HISTORY
// GET /admin/admin-withdrawals
// =====================================================

router.get(
    "/admin-withdrawals",
    authenticateToken,
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        amount,
                        bank_name,
                        account_name,
                        account_number,
                        status,
                        failure_reason,
                        requested_at,
                        processing_at,
                        completed_at,
                        provider_reference,
                        admin_note

                    FROM admin_withdrawals

                    ORDER BY id DESC
                    `
                );

            res.json({
                success: true,
                withdrawals: rows
            });

        } catch (error) {

            console.error(
                "ADMIN WITHDRAWALS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load admin withdrawals."
            });
        }
    }
);


// =====================================================
// PROCESS ADMIN WITHDRAWAL
// PUT /admin/admin-withdrawals/:id/process
// =====================================================

router.put(
    "/admin-withdrawals/:id/process",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            const [rows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        amount,
                        status

                    FROM admin_withdrawals

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [req.params.id]
                );

            if (!rows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Admin withdrawal not found."
                });
            }

            const withdrawal =
                rows[0];

            if (
                String(withdrawal.status)
                    .toLowerCase() !== "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Only pending withdrawals can be processed."
                });
            }

            await connection.query(
                `
                UPDATE admin_withdrawals

                SET
                    status = 'Processing',
                    processing_at =
                        CURRENT_TIMESTAMP,
                    admin_note = ?

                WHERE id = ?
                `,
                [
                    req.body.admin_note ||
                    "Withdrawal is being processed.",

                    req.params.id
                ]
            );

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Withdrawal moved to processing."
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "PROCESS ADMIN WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to process withdrawal."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// COMPLETE ADMIN WITHDRAWAL
// PUT /admin/admin-withdrawals/:id/complete
// =====================================================

router.put(
    "/admin-withdrawals/:id/complete",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            const reference =
                String(
                    req.body.provider_reference || ""
                ).trim();

            if (!reference) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Enter the bank transfer reference."
                });
            }

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            const [rows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        amount,
                        status

                    FROM admin_withdrawals

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [req.params.id]
                );

            if (!rows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Admin withdrawal not found."
                });
            }

            const withdrawal =
                rows[0];

            if (
                String(withdrawal.status)
                    .toLowerCase() !== "processing"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Only processing withdrawals can be completed."
                });
            }

            await connection.query(
                `
                UPDATE admin_withdrawals

                SET
                    status = 'Completed',
                    provider_reference = ?,
                    admin_note = ?,
                    completed_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `,
                [
                    reference,

                    req.body.admin_note ||
                    "Bank transfer completed.",

                    req.params.id
                ]
            );

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Admin withdrawal marked as completed."
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "COMPLETE ADMIN WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to complete withdrawal."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// REJECT ADMIN WITHDRAWAL
// PUT /admin/admin-withdrawals/:id/reject
//
// Money was reserved when the request was created.
// Rejection restores the money.
// =====================================================

router.put(
    "/admin-withdrawals/:id/reject",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            connection =
                await db.getConnection();

            await connection.beginTransaction();

            const [rows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        amount,
                        status

                    FROM admin_withdrawals

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [req.params.id]
                );

            if (!rows.length) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "Admin withdrawal not found."
                });
            }

            const withdrawal =
                rows[0];

            const status =
                String(
                    withdrawal.status
                ).toLowerCase();

            if (
                status !== "pending" &&
                status !== "processing"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "This withdrawal can no longer be rejected."
                });
            }

            const amount =
                Number(withdrawal.amount);

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid withdrawal amount."
                });
            }

            // ---------------------------------------------
            // RESTORE ADMIN WALLET
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE admin_wallet

                SET
                    balance =
                        COALESCE(balance, 0)
                        + ?,

                    total_withdrawn =
                        GREATEST(
                            COALESCE(total_withdrawn, 0)
                            - ?,
                            0
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = 1
                `,
                [
                    amount,
                    amount
                ]
            );

            // ---------------------------------------------
            // MARK REJECTED
            // ---------------------------------------------

            await connection.query(
                `
                UPDATE admin_withdrawals

                SET
                    status = 'Rejected',
                    failure_reason = ?,
                    admin_note = ?

                WHERE id = ?
                `,
                [
                    req.body.reason ||
                    "Withdrawal rejected by administrator.",

                    req.body.admin_note ||
                    "Withdrawal rejected.",

                    req.params.id
                ]
            );

            await connection.commit();

            res.json({
                success: true,
                message:
                    "Withdrawal rejected and admin balance restored."
            });

        } catch (error) {

            if (connection) {
                await connection.rollback();
            }

            console.error(
                "REJECT ADMIN WITHDRAWAL ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to reject withdrawal."
            });

        } finally {

            if (connection) {
                connection.release();
            }
        }
    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;