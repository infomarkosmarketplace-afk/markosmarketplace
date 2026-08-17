const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");


/*
=========================================================
SELLER PAYMENT & DELIVERY SETTINGS
=========================================================

Only the authenticated seller can access/update
their own payment and delivery information.
=========================================================
*/


/*
=========================================================
GET SELLER SETTINGS
=========================================================
*/

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const sellerId =
                Number(req.user.id);


            if (
                !Number.isInteger(sellerId) ||
                sellerId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid seller account."

                });

            }


            /*
            =============================================
            PAYMENT DETAILS
            =============================================
            */

            const [
                paymentRows
            ] = await db.query(

                `
                SELECT
                    id,
                    seller_id,
                    country_code,
                    payment_method,
                    account_holder_name,
                    bank_name,
                    account_number,
                    branch_name,
                    routing_number,
                    sort_code,
                    iban,
                    swift_bic,
                    accepted_currencies,
                    created_at,
                    updated_at

                FROM seller_payment_details

                WHERE seller_id = ?

                LIMIT 1
                `,

                [sellerId]

            );


            /*
            =============================================
            DELIVERY SETTINGS
            =============================================
            */

            const [
                deliveryRows
            ] = await db.query(

                `
                SELECT
                    id,
                    seller_id,
                    delivery_available,
                    delivery_fee,
                    delivery_areas,
                    estimated_delivery_time,
                    pickup_available,
                    pickup_location,
                    created_at,
                    updated_at

                FROM seller_delivery_settings

                WHERE seller_id = ?

                LIMIT 1
                `,

                [sellerId]

            );


            return res.json({

                success: true,

                payment:
                    paymentRows.length
                        ? paymentRows[0]
                        : null,

                delivery:
                    deliveryRows.length
                        ? deliveryRows[0]
                        : null

            });

        }

        catch (error) {

            console.error(
                "GET SELLER SETTINGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load seller settings."

            });

        }

    }
);


/*
=========================================================
SAVE PAYMENT DETAILS
=========================================================
*/

router.post(
    "/payment",
    authenticateToken,
    async (req, res) => {

        try {

            const sellerId =
                Number(req.user.id);


            if (
                !Number.isInteger(sellerId) ||
                sellerId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid seller account."

                });

            }


            const {

                country_code,

                payment_method,

                account_holder_name,

                bank_name,

                account_number,

                branch_name,

                routing_number,

                sort_code,

                iban,

                swift_bic,

                accepted_currencies

            } = req.body;


            /*
            =============================================
            REQUIRED FIELDS
            =============================================
            */

            if (
                !account_holder_name ||
                !String(account_holder_name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Account holder name is required."

                });

            }


            if (
                !bank_name ||
                !String(bank_name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Bank name is required."

                });

            }


            if (
                !account_number ||
                !String(account_number).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Account number is required."

                });

            }


            /*
            =============================================
            CURRENCIES
            =============================================
            */

            let currencies =
                accepted_currencies;


            if (
                Array.isArray(currencies)
            ) {

                currencies =
                    currencies
                        .map(
                            currency =>
                                String(currency)
                                    .trim()
                                    .toUpperCase()
                        )
                        .filter(
                            currency =>
                                ["NAD", "USD", "EUR"]
                                    .includes(currency)
                        )
                        .join(",");

            }


            if (!currencies) {

                currencies =
                    "NAD,USD,EUR";

            }


            /*
            =============================================
            INSERT OR UPDATE
            =============================================
            */

            await db.query(

                `
                INSERT INTO seller_payment_details
                (
                    seller_id,
                    country_code,
                    payment_method,
                    account_holder_name,
                    bank_name,
                    account_number,
                    branch_name,
                    routing_number,
                    sort_code,
                    iban,
                    swift_bic,
                    accepted_currencies
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE

                    country_code =
                        VALUES(country_code),

                    payment_method =
                        VALUES(payment_method),

                    account_holder_name =
                        VALUES(account_holder_name),

                    bank_name =
                        VALUES(bank_name),

                    account_number =
                        VALUES(account_number),

                    branch_name =
                        VALUES(branch_name),

                    routing_number =
                        VALUES(routing_number),

                    sort_code =
                        VALUES(sort_code),

                    iban =
                        VALUES(iban),

                    swift_bic =
                        VALUES(swift_bic),

                    accepted_currencies =
                        VALUES(accepted_currencies)
                `,

                [

                    sellerId,

                    country_code || null,

                    payment_method ||
                        "Bank Transfer",

                    String(
                        account_holder_name
                    ).trim(),

                    String(
                        bank_name
                    ).trim(),

                    String(
                        account_number
                    ).trim(),

                    branch_name
                        ? String(branch_name).trim()
                        : null,

                    routing_number
                        ? String(routing_number).trim()
                        : null,

                    sort_code
                        ? String(sort_code).trim()
                        : null,

                    iban
                        ? String(iban).trim()
                        : null,

                    swift_bic
                        ? String(swift_bic).trim()
                        : null,

                    currencies

                ]

            );


            return res.json({

                success: true,

                message:
                    "Payment details saved successfully."

            });

        }

        catch (error) {

            console.error(
                "SAVE PAYMENT DETAILS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save payment details."

            });

        }

    }
);


/*
=========================================================
SAVE DELIVERY SETTINGS
=========================================================
*/

router.post(
    "/delivery",
    authenticateToken,
    async (req, res) => {

        try {

            const sellerId =
                Number(req.user.id);


            if (
                !Number.isInteger(sellerId) ||
                sellerId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid seller account."

                });

            }


            const {

                delivery_available,

                delivery_fee,

                delivery_areas,

                estimated_delivery_time,

                pickup_available,

                pickup_location

            } = req.body;


            /*
            =============================================
            DELIVERY FEE
            =============================================
            */

            let fee =
                Number(delivery_fee || 0);


            if (
                !Number.isFinite(fee) ||
                fee < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid delivery fee."

                });

            }


            fee =
                Number(
                    fee.toFixed(2)
                );


            /*
            =============================================
            INSERT OR UPDATE
            =============================================
            */

            await db.query(

                `
                INSERT INTO seller_delivery_settings
                (
                    seller_id,
                    delivery_available,
                    delivery_fee,
                    delivery_areas,
                    estimated_delivery_time,
                    pickup_available,
                    pickup_location
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE

                    delivery_available =
                        VALUES(delivery_available),

                    delivery_fee =
                        VALUES(delivery_fee),

                    delivery_areas =
                        VALUES(delivery_areas),

                    estimated_delivery_time =
                        VALUES(estimated_delivery_time),

                    pickup_available =
                        VALUES(pickup_available),

                    pickup_location =
                        VALUES(pickup_location)
                `,

                [

                    sellerId,

                    delivery_available
                        ? 1
                        : 0,

                    fee,

                    delivery_areas
                        ? String(
                            delivery_areas
                        ).trim()
                        : null,

                    estimated_delivery_time
                        ? String(
                            estimated_delivery_time
                        ).trim()
                        : null,

                    pickup_available
                        ? 1
                        : 0,

                    pickup_location
                        ? String(
                            pickup_location
                        ).trim()
                        : null

                ]

            );


            return res.json({

                success: true,

                message:
                    "Delivery settings saved successfully."

            });

        }

        catch (error) {

            console.error(
                "SAVE DELIVERY SETTINGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save delivery settings."

            });

        }

    }
);


module.exports = router;