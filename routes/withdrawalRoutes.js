const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");


// =====================================================
// GET SELLER BALANCE
// GET /withdrawal_request/info
// =====================================================

router.get(
    "/info",
    authenticateToken,
    async (req, res) => {

        try {

            console.log("=================================");
            console.log("WITHDRAWAL BALANCE REQUEST");
            console.log("USER:", req.user);
            console.log("=================================");


            const sellerId =
                req.user?.id ||
                req.user?.user_id ||
                req.user?.seller_id;


            if (!sellerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Seller ID not found. Please log in again."

                });

            }


            const [rows] =
                await db.query(
                    `
                    SELECT
                        balance,
                        total_earned,
                        total_withdrawn
                    FROM seller_wallet
                    WHERE seller_id = ?
                    LIMIT 1
                    `,
                    [sellerId]
                );


            // Seller has no wallet yet

            if (rows.length === 0) {

                return res.json({

                    success: true,

                    balance: 0,

                    total_earned: 0,

                    total_withdrawn: 0

                });

            }


            return res.json({

                success: true,

                balance:
                    Number(rows[0].balance || 0),

                total_earned:
                    Number(rows[0].total_earned || 0),

                total_withdrawn:
                    Number(rows[0].total_withdrawn || 0)

            });


        } catch (error) {

            console.error(
                "GET WITHDRAWAL BALANCE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load seller balance.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// REQUEST BANK WITHDRAWAL
// POST /withdrawal_request/request
// =====================================================

router.post(
    "/request",
    authenticateToken,
    async (req, res) => {

        try {

            console.log("=================================");
            console.log("WITHDRAWAL REQUEST");
            console.log("USER:", req.user);
            console.log("BODY:", req.body);
            console.log("=================================");


            const sellerId =
                req.user?.id ||
                req.user?.user_id ||
                req.user?.seller_id;


            if (!sellerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Seller ID not found. Please log in again."

                });

            }


            const {
                account_holder,
                bank_name,
                country,
                account_number,
                iban,
                swift,
                currency,
                amount
            } = req.body;


            // =================================================
            // VALIDATION
            // =================================================

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


            if (!account_holder) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Account holder name is required."

                });

            }


            if (!bank_name) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Bank name is required."

                });

            }


            if (!country) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Bank country is required."

                });

            }


            if (!account_number) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Account number is required."

                });

            }


            // =================================================
            // GET SELLER WALLET
            // =================================================

            const [walletRows] =
                await db.query(
                    `
                    SELECT
                        balance
                    FROM seller_wallet
                    WHERE seller_id = ?
                    LIMIT 1
                    `,
                    [sellerId]
                );


            if (walletRows.length === 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Seller wallet not found."

                });

            }


            const balance =
                Number(
                    walletRows[0].balance || 0
                );


            // =================================================
            // CHECK BALANCE
            // =================================================

            if (withdrawalAmount > balance) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Insufficient balance."

                });

            }


            // =================================================
            // CREATE WITHDRAWAL REQUEST
            // =================================================

            const [result] =
                await db.query(
                    `
                    INSERT INTO seller_withdrawals
                    (
                        seller_id,
                        amount,
                        currency,
                        payout_method,
                        account_holder,
                        bank_name,
                        country,
                        account_number,
                        iban,
                        swift_bic,
                        status,
                        requested_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    `,
                    [
                        sellerId,
                        withdrawalAmount,
                        currency || "USD",
                        "bank_transfer",
                        account_holder,
                        bank_name,
                        country,
                        account_number,
                        iban || null,
                        swift || null,
                        "pending"
                    ]
                );


            console.log(
                "Withdrawal request created:",
                result.insertId
            );


            return res.status(201).json({

                success: true,

                message:
                    "Bank withdrawal request submitted successfully.",

                withdrawalId:
                    result.insertId

            });


        } catch (error) {

            console.error(
                "WITHDRAWAL REQUEST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Withdrawal request failed.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;