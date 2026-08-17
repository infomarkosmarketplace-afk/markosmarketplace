const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");


// =====================================================
// GET PENDING BUYER PAYMENTS
// =====================================================

router.get(
    "/pending",
    authenticateToken,
    async (req, res) => {

        try {

            const [payments] = await db.query(`
                SELECT
                    p.id,
                    p.order_id,
                    p.buyer_id,
                    p.receipt_image,
                    p.status,
                    p.uploaded_at,
                    o.total_amount,
                    o.currency,
                    o.status AS order_status
                FROM payment_proofs p
                INNER JOIN orders o
                    ON p.order_id = o.id
                WHERE LOWER(p.status) = 'pending'
                ORDER BY p.uploaded_at DESC
            `);

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
                    "Unable to load pending payments."
            });
        }
    }
);


// =====================================================
// APPROVE BUYER PAYMENT
// =====================================================

router.put(
    "/approve/:orderId",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            const orderId =
                Number(req.params.orderId);

            if (!orderId) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID."
                });
            }


            connection =
                await db.getConnection();

            await connection.beginTransaction();


            // =================================================
            // 1. GET PAYMENT PROOF + LOCK IT
            // =================================================

            const [paymentRows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        order_id,
                        buyer_id,
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


            // =================================================
            // PREVENT DOUBLE APPROVAL
            // =================================================

            if (
                String(payment.status).toLowerCase() !==
                "pending"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        `Payment is already ${payment.status}.`
                });
            }


            // =================================================
            // 2. GET ORDER + LOCK IT
            // =================================================

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


            // =================================================
            // VERIFY PAYMENT BELONGS TO ORDER BUYER
            // =================================================

            if (
                Number(payment.buyer_id) !==
                Number(order.buyer_id)
            ) {

                throw new Error(
                    "Payment proof does not belong to this order."
                );
            }


            // =================================================
            // PREVENT ALREADY PAID ORDER
            // =================================================

            if (
                String(order.status).toLowerCase() ===
                "paid"
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "This order has already been paid."
                });
            }


            // =================================================
            // 3. GET ORDER ITEMS
            // =================================================

            const [items] =
                await connection.query(
                    `
                    SELECT
                        id,
                        order_id,
                        product_id,
                        seller_id,
                        product_name,
                        quantity,
                        price
                    FROM order_items
                    WHERE order_id = ?
                    FOR UPDATE
                    `,
                    [orderId]
                );


            if (!items.length) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "No products were found in this order."
                });
            }


            // =================================================
            // TOTALS
            // =================================================

            let sellerTotal = 0;
            let adminTotal = 0;


            // =================================================
            // 4. PROCESS PRODUCTS
            // =================================================

            for (const item of items) {

                const sellerId =
                    Number(item.seller_id);

                const productId =
                    Number(item.product_id);

                const price =
                    Number(item.price);

                const quantity =
                    Math.max(
                        1,
                        Number(item.quantity) || 1
                    );


                if (!sellerId) {

                    throw new Error(
                        `Seller ID missing for order item ${item.id}.`
                    );
                }


                if (!productId) {

                    throw new Error(
                        `Product ID missing for order item ${item.id}.`
                    );
                }


                if (
                    !Number.isFinite(price) ||
                    price <= 0
                ) {

                    throw new Error(
                        `Invalid price for order item ${item.id}.`
                    );
                }


                const itemTotal =
                    Number(
                        (
                            price * quantity
                        ).toFixed(2)
                    );


                // =================================================
                // 70% SELLER
                // =================================================

                const sellerAmount =
                    Number(
                        (
                            itemTotal * 0.70
                        ).toFixed(2)
                    );


                // =================================================
                // 30% MARKETPLACE
                // =================================================

                const adminAmount =
                    Number(
                        (
                            itemTotal * 0.30
                        ).toFixed(2)
                    );


                sellerTotal +=
                    sellerAmount;

                adminTotal +=
                    adminAmount;


                // =================================================
                // 5. TRANSACTION RECORD
                // =================================================

                await connection.query(
                    `
                    INSERT INTO transactions
                    (
                        order_id,
                        seller_id,
                        product_id,
                        amount,
                        currency,
                        admin_commission,
                        seller_amount,
                        status
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        orderId,
                        sellerId,
                        productId,
                        itemTotal,
                        order.currency,
                        adminAmount,
                        sellerAmount,
                        "Completed"
                    ]
                );


                // =================================================
                // 6. SELLER WALLET
                // =================================================

                await connection.query(
                    `
                    INSERT INTO seller_wallet
                    (
                        seller_id,
                        balance,
                        total_earned,
                        total_withdrawn
                    )
                    VALUES
                    (?, ?, ?, 0)

                    ON DUPLICATE KEY UPDATE

                        balance =
                            balance + VALUES(balance),

                        total_earned =
                            total_earned +
                            VALUES(total_earned)
                    `,
                    [
                        sellerId,
                        sellerAmount,
                        sellerAmount
                    ]
                );


                // =================================================
                // 7. ADMIN REVENUE
                // =================================================

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
                        adminAmount,
                        "30% MarketHub commission"
                    ]
                );

            }


            // =================================================
            // 8. ADMIN WALLET
            // =================================================

            await connection.query(
                `
                INSERT INTO admin_wallet
                (
                    id,
                    balance,
                    total_earned,
                    total_withdrawn
                )
                VALUES
                (1, ?, ?, 0)

                ON DUPLICATE KEY UPDATE

                    balance =
                        balance + VALUES(balance),

                    total_earned =
                        total_earned +
                        VALUES(total_earned)
                `,
                [
                    adminTotal,
                    adminTotal
                ]
            );


            // =================================================
            // 9. APPROVE PAYMENT PROOF
            // =================================================

            await connection.query(
                `
                UPDATE payment_proofs
                SET status = 'Approved'
                WHERE id = ?
                AND LOWER(status) = 'pending'
                `,
                [payment.id]
            );


            // =================================================
            // 10. MARK ORDER PAID
            // =================================================

            await connection.query(
                `
                UPDATE orders
                SET status = 'Paid'
                WHERE id = ?
                `,
                [orderId]
            );


            // =================================================
            // 11. COMMIT
            // =================================================

            await connection.commit();


            // =================================================
            // SUCCESS
            // =================================================

            res.json({

                success: true,

                message:
                    "Payment approved successfully.",

                order_id:
                    orderId,

                seller_total:
                    Number(
                        sellerTotal.toFixed(2)
                    ),

                marketplace_commission:
                    Number(
                        adminTotal.toFixed(2)
                    )

            });


        } catch (error) {

            if (connection) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );
                }
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


module.exports = router;