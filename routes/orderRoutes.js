const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");


/*
=========================================================
CREATE ORDER

MARKETPLACE PAYMENT MODEL

Buyer
↓
Creates order
↓
Database verifies products
↓
Seller bank details are retrieved
↓
Seller delivery settings are retrieved
↓
Buyer pays seller directly
↓
Product price + delivery fee = total
↓
30% of combined amount = MarketHub commission
↓
70% of combined amount = seller amount

SUPPORTED CURRENCIES:
NAD
USD
EUR
=========================================================
*/


router.post(
    "/create",
    authenticateToken,
    async (req, res) => {

        let connection;

        try {

            /*
            =================================================
            BUYER
            =================================================
            */

            const buyerId =
                Number(req.user.id);


            if (
                !Number.isInteger(buyerId) ||
                buyerId <= 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid buyer account."

                });

            }


            /*
            =================================================
            REQUEST DATA
            =================================================
            */

            const {
                items,
                currency
            } = req.body;


            /*
            =================================================
            VALIDATE CART
            =================================================
            */

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your cart is empty."

                });

            }


            /*
            =================================================
            VALIDATE CURRENCY
            =================================================
            */

            const orderCurrency =
                String(currency || "NAD")
                    .trim()
                    .toUpperCase();


            const allowedCurrencies = [
                "NAD",
                "USD",
                "EUR"
            ];


            if (
                !allowedCurrencies.includes(
                    orderCurrency
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order currency. Use NAD, USD or EUR."

                });

            }


            /*
            =================================================
            DATABASE CONNECTION
            =================================================
            */

            connection =
                await db.getConnection();


            await connection.beginTransaction();


            /*
            =================================================
            SELLER MAP
            =================================================
            */

            const sellersMap =
                new Map();


            /*
            =================================================
            PROCESS CART
            =================================================
            */

            for (
                const item of items
            ) {

                const rawProductId =
                    item.product_id ??
                    item.id;


                const productId =
                    Number(rawProductId);


                if (
                    !Number.isInteger(productId) ||
                    productId <= 0
                ) {

                    throw new Error(
                        "A cart item is missing product information."
                    );

                }


                /*
                =================================================
                GET REAL PRODUCT FROM DATABASE
                =================================================
                */

                const [
                    productRows
                ] = await connection.query(

                    `
                    SELECT
                        id,
                        seller_id,
                        product_name,
                        price,
                        stock

                    FROM products

                    WHERE id = ?

                    LIMIT 1
                    `,

                    [
                        productId
                    ]

                );


                if (
                    !productRows.length
                ) {

                    throw new Error(
                        `Product ${productId} no longer exists.`
                    );

                }


                const product =
                    productRows[0];


                /*
                =================================================
                REAL SELLER
                =================================================
                */

                const sellerId =
                    Number(
                        product.seller_id
                    );


                if (
                    !Number.isInteger(sellerId) ||
                    sellerId <= 0
                ) {

                    throw new Error(
                        `Product ${productId} does not have a valid seller.`
                    );

                }


                /*
                =================================================
                QUANTITY
                =================================================
                */

                const quantity =
                    Number(item.quantity);


                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {

                    throw new Error(
                        `Invalid quantity for product ${productId}.`
                    );

                }


                /*
                =================================================
                STOCK
                =================================================
                */

                const stock =
                    Number(product.stock);


                if (
                    !Number.isInteger(stock) ||
                    stock < quantity
                ) {

                    throw new Error(
                        `Product "${product.product_name}" does not have enough stock.`
                    );

                }


                /*
                =================================================
                PRODUCT PRICE
                =================================================

                Price comes directly from database.
                =================================================
                */

                const price =
                    Number(product.price);


                if (
                    !Number.isFinite(price) ||
                    price <= 0
                ) {

                    throw new Error(
                        `Product ${productId} has an invalid price.`
                    );

                }


                /*
                =================================================
                PRODUCT TOTAL
                =================================================
                */

                const itemTotal =
                    Number(
                        (
                            price * quantity
                        ).toFixed(2)
                    );


                /*
                =================================================
                CREATE SELLER ENTRY
                =================================================
                */

                if (
                    !sellersMap.has(
                        sellerId
                    )
                ) {

                    sellersMap.set(

                        sellerId,

                        {

                            seller_id:
                                sellerId,

                            product_total:
                                0,

                            delivery_fee:
                                0,

                            items:
                                []

                        }

                    );

                }


                const seller =
                    sellersMap.get(
                        sellerId
                    );


                seller.product_total +=
                    itemTotal;


                seller.items.push({

                    product_id:
                        productId,

                    product_name:
                        product.product_name,

                    quantity,

                    price,

                    item_total:
                        itemTotal

                });

            }


            /*
            =================================================
            SELLERS RESPONSE
            =================================================
            */

            const sellers = [];


            /*
            =================================================
            ORDER TOTAL
            =================================================
            */

            let orderTotal = 0;


            /*
            =================================================
            PROCESS EACH SELLER
            =================================================
            */

            for (
                const seller
                of sellersMap.values()
            ) {

                /*
                =================================================
                GET SELLER PAYMENT DETAILS
                =================================================

                Uses the NEW table:

                seller_payment_details

                No verified-payment requirement here.
                =================================================
                */

                const [
                    paymentRows
                ] = await connection.query(

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
                        accepted_currencies

                    FROM seller_payment_details

                    WHERE seller_id = ?

                    LIMIT 1
                    `,

                    [
                        seller.seller_id
                    ]

                );


                const payment =
                    paymentRows.length
                        ? paymentRows[0]
                        : null;


                /*
                =================================================
                GET SELLER DELIVERY SETTINGS
                =================================================
                */

                const [
                    deliveryRows
                ] = await connection.query(

                    `
                    SELECT
                        id,
                        seller_id,
                        delivery_available,
                        delivery_fee,
                        delivery_areas,
                        estimated_delivery_time,
                        pickup_available,
                        pickup_location

                    FROM seller_delivery_settings

                    WHERE seller_id = ?

                    LIMIT 1
                    `,

                    [
                        seller.seller_id
                    ]

                );


                const delivery =
                    deliveryRows.length
                        ? deliveryRows[0]
                        : null;


                /*
                =================================================
                DELIVERY FEE
                =================================================

                Delivery fee is charged once per seller.
                =================================================
                */

                let deliveryFee = 0;


                if (
                    delivery &&
                    Number(
                        delivery.delivery_available
                    ) === 1
                ) {

                    deliveryFee =
                        Number(
                            delivery.delivery_fee || 0
                        );


                    if (
                        !Number.isFinite(
                            deliveryFee
                        ) ||
                        deliveryFee < 0
                    ) {

                        deliveryFee = 0;

                    }

                }


                seller.delivery_fee =
                    Number(
                        deliveryFee.toFixed(2)
                    );


                /*
                =================================================
                SELLER TRANSACTION AMOUNT
                =================================================

                PRODUCT + DELIVERY
                =================================================
                */

                const sellerTotal =
                    Number(

                        (
                            seller.product_total +
                            seller.delivery_fee

                        ).toFixed(2)

                    );


                /*
                =================================================
                MARKETPLACE COMMISSION
                =================================================

                30% OF PRODUCT + DELIVERY
                =================================================
                */

                const commission =
                    Number(

                        (
                            sellerTotal * 0.30

                        ).toFixed(2)

                    );


                /*
                =================================================
                SELLER EARNINGS
                =================================================

                70% OF PRODUCT + DELIVERY
                =================================================
                */

                const sellerEarnings =
                    Number(

                        (
                            sellerTotal * 0.70

                        ).toFixed(2)

                    );


                /*
                =================================================
                ADD TO ORDER TOTAL
                =================================================
                */

                orderTotal +=
                    sellerTotal;


                /*
                =================================================
                PAYMENT REFERENCE
                =================================================
                */

                const paymentReference =
                    `MH-${Date.now()}-${seller.seller_id}`;


                /*
                =================================================
                BUILD SELLER RESPONSE
                =================================================
                */

                sellers.push({

                    seller_id:
                        seller.seller_id,

                    product_total:
                        Number(
                            seller.product_total.toFixed(2)
                        ),

                    delivery_fee:
                        seller.delivery_fee,

                    total_amount:
                        sellerTotal,

                    commission:
                        commission,

                    seller_amount:
                        sellerEarnings,

                    payment_reference:
                        paymentReference,


                    /*
                    =============================================
                    SELLER BANK DETAILS
                    =============================================
                    */

                    payment:
                        payment
                            ? {

                                sellerName:
                                    payment.account_holder_name,

                                paymentMethod:
                                    payment.payment_method,

                                countryCode:
                                    payment.country_code,

                                bankName:
                                    payment.bank_name,

                                accountName:
                                    payment.account_holder_name,

                                accountNumber:
                                    payment.account_number,

                                branchName:
                                    payment.branch_name,

                                routingNumber:
                                    payment.routing_number,

                                sortCode:
                                    payment.sort_code,

                                iban:
                                    payment.iban,

                                swiftBic:
                                    payment.swift_bic,

                                acceptedCurrencies:
                                    payment.accepted_currencies,

                                paymentReference:
                                    paymentReference

                            }

                            : null,


                    /*
                    =============================================
                    DELIVERY INFORMATION
                    =============================================
                    */

                    delivery:
                        delivery
                            ? {

                                deliveryAvailable:
                                    Boolean(
                                        Number(
                                            delivery.delivery_available
                                        )
                                    ),

                                deliveryFee:
                                    seller.delivery_fee,

                                deliveryAreas:
                                    delivery.delivery_areas,

                                estimatedDeliveryTime:
                                    delivery.estimated_delivery_time,

                                pickupAvailable:
                                    Boolean(
                                        Number(
                                            delivery.pickup_available
                                        )
                                    ),

                                pickupLocation:
                                    delivery.pickup_location

                            }

                            : null,


                    /*
                    =============================================
                    PRODUCTS
                    =============================================
                    */

                    items:
                        seller.items

                });

            }


            /*
            =================================================
            FINAL ORDER TOTAL
            =================================================
            */

            orderTotal =
                Number(
                    orderTotal.toFixed(2)
                );


            if (
                !Number.isFinite(orderTotal) ||
                orderTotal <= 0
            ) {

                throw new Error(
                    "Unable to calculate order total."
                );

            }


            /*
            =================================================
            CREATE ORDER
            =================================================
            */

            const [
                orderResult
            ] = await connection.query(

                `
                INSERT INTO orders
                (
                    buyer_id,
                    total_amount,
                    currency,
                    status
                )

                VALUES
                (?, ?, ?, ?)
                `,

                [
                    buyerId,
                    orderTotal,
                    orderCurrency,
                    "Pending Payment"
                ]

            );


            const orderId =
                orderResult.insertId;


            /*
            =================================================
            INSERT ORDER ITEMS
            =================================================
            */

            for (
                const seller
                of sellers
            ) {

                for (
                    const item
                    of seller.items
                ) {

                    await connection.query(

                        `
                        INSERT INTO order_items
                        (
                            order_id,
                            product_id,
                            seller_id,
                            product_name,
                            quantity,
                            price
                        )

                        VALUES
                        (?, ?, ?, ?, ?, ?)
                        `,

                        [

                            orderId,

                            item.product_id,

                            seller.seller_id,

                            item.product_name,

                            item.quantity,

                            item.price

                        ]

                    );

                }

            }


            /*
            =================================================
            COMMIT
            =================================================
            */

            await connection.commit();


            /*
            =================================================
            SUCCESS
            =================================================
            */

            return res.status(201).json({

                success: true,

                order_id:
                    orderId,

                total_amount:
                    orderTotal,

                currency:
                    orderCurrency,

                status:
                    "Pending Payment",

                sellers,

                commission_rate:
                    30,

                seller_rate:
                    70,

                message:
                    "Order created successfully. Pay the seller directly using the seller's payment details."

            });

        }


        catch (error) {

            /*
            =================================================
            ROLLBACK
            =================================================
            */

            if (connection) {

                try {

                    await connection.rollback();

                }

                catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );

                }

            }


            console.error(
                "CREATE ORDER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to create order."

            });

        }


        finally {

            /*
            =================================================
            RELEASE DATABASE CONNECTION
            =================================================
            */

            if (connection) {

                connection.release();

            }

        }

    }
);


module.exports = router;