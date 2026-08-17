const express = require("express");
const router = express.Router();

const db = require("../config/db");

const {
    authenticateToken
} = require("./authRoutes");


// =====================================
// ADD SELLER PAYOUT ACCOUNT
// POST /seller-payout/add
// =====================================

router.post("/add", authenticateToken, (req, res) => {

    const seller_id = req.user.id;

    const {
        country_code,
        payout_method,
        account_holder_name,
        bank_name,
        account_number,
        routing_number,
        sort_code,
        iban,
        swift_bic,
        currency
    } = req.body;

    if (
        !country_code ||
        !payout_method ||
        !account_holder_name ||
        !currency
    ) {
        return res.status(400).json({
            message: "Please fill in all required fields."
        });
    }

    const sql = `
        INSERT INTO seller_payout_accounts
        (
            seller_id,
            country_code,
            payout_method,
            account_holder_name,
            bank_name,
            account_number,
            routing_number,
            sort_code,
            iban,
            swift_bic,
            currency
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            seller_id,
            country_code,
            payout_method,
            account_holder_name,
            bank_name,
            account_number,
            routing_number,
            sort_code,
            iban,
            swift_bic,
            currency
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Failed to save payout account."
                });
            }

            res.json({
                success: true,
                message: "Payout account saved successfully."
            });

        }
    );

});


// =====================================
// GET LOGGED IN SELLER PAYOUT ACCOUNT
// GET /seller-payout/me
// =====================================

router.get("/me", authenticateToken, (req, res) => {

    const seller_id = req.user.id;

    db.query(
        "SELECT * FROM seller_payout_accounts WHERE seller_id = ?",
        [seller_id],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json(results);

        }
    );

});


// =====================================
// UPDATE PAYOUT ACCOUNT
// PUT /seller-payout/update/:id
// =====================================

router.put("/update/:id", authenticateToken, (req, res) => {

    const seller_id = req.user.id;

    const accountId = req.params.id;

    const {
        country_code,
        payout_method,
        account_holder_name,
        bank_name,
        account_number,
        routing_number,
        sort_code,
        iban,
        swift_bic,
        currency
    } = req.body;

    const sql = `
        UPDATE seller_payout_accounts
        SET
            country_code = ?,
            payout_method = ?,
            account_holder_name = ?,
            bank_name = ?,
            account_number = ?,
            routing_number = ?,
            sort_code = ?,
            iban = ?,
            swift_bic = ?,
            currency = ?
        WHERE id = ?
        AND seller_id = ?
    `;

    db.query(
        sql,
        [
            country_code,
            payout_method,
            account_holder_name,
            bank_name,
            account_number,
            routing_number,
            sort_code,
            iban,
            swift_bic,
            currency,
            accountId,
            seller_id
        ],
        (err) => {

            if (err) {

                return res.status(500).json({
                    message: "Failed to update payout account."
                });

            }

            res.json({
                success: true,
                message: "Payout account updated successfully."
            });

        }
    );

});

module.exports = router;