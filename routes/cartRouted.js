const express = require("express");
const router = express.Router();

const db = require("../config/db");

const {
    authenticateToken
} = require("./authRoutes");


// ================================
// TEST CART ROUTE
// GET /cart/test
// ================================

router.get("/cart/test", (req, res) => {

    res.json({

        success: true,

        message:
        "Cart routes working."

    });

});

// ================================
// ADD TO CART
// POST /cart/add
// ================================

router.post(
"/cart/add",
authenticateToken,
(req, res) => {


    const {
        product_id,
        quantity
    } = req.body;



    if(!product_id){

        return res.status(400).json({

            success:false,
            message:"Product ID required."

        });

    }



    const qty = quantity || 1;



    // Check product exists

    db.query(

        `
        SELECT *
        FROM products
        WHERE id = ?
        `,

        [product_id],

        (err, products)=>{


            if(err){

                return res.status(500).json({

                    success:false,
                    message:"Database error."

                });

            }



            if(products.length === 0){

                return res.status(404).json({

                    success:false,
                    message:"Product not found."

                });

            }



            // Check if already in cart

            db.query(

                `
                SELECT *
                FROM cart
                WHERE user_id = ?
                AND product_id = ?
                `,

                [
                    req.user.id,
                    product_id
                ],

                (err, cartItems)=>{


                    if(err){

                        return res.status(500).json({

                            success:false,
                            message:"Cart check failed."

                        });

                    }



                    if(cartItems.length > 0){


                        // Increase quantity

                        db.query(

                            `
                            UPDATE cart
                            SET quantity = quantity + ?
                            WHERE user_id = ?
                            AND product_id = ?
                            `,

                            [
                                qty,
                                req.user.id,
                                product_id
                            ],

                            ()=>{


                                res.json({

                                    success:true,

                                    message:
                                    "Cart updated."

                                });


                            }

                        );


                    }else{


                        // Add new item

                        db.query(

                            `
                            INSERT INTO cart
                            (
                                user_id,
                                product_id,
                                quantity
                            )

                            VALUES(?,?,?)

                            `,

                            [
                                req.user.id,
                                product_id,
                                qty
                            ],

                            (err)=>{


                                if(err){

                                    return res.status(500).json({

                                        success:false,
                                        message:"Could not add to cart."

                                    });

                                }



                                res.status(201).json({

                                    success:true,

                                    message:
                                    "Product added to cart."

                                });


                            }

                        );


                    }


                }

            );


        }

    );


});

// ================================
// VIEW CART
// GET /cart
// ================================

router.get(
"/cart",
authenticateToken,
(req, res) => {


    const sql = `

        SELECT

        cart.id AS cart_id,
        cart.quantity,

        products.id AS product_id,
        products.product_name,
        products.description,
        products.price,
        products.images,
        products.category

        FROM cart

        INNER JOIN products
        ON cart.product_id = products.id

        WHERE cart.user_id = ?

        ORDER BY cart.id DESC

    `;



    db.query(

        sql,

        [req.user.id],

        (err, results)=>{


            if(err){

                return res.status(500).json({

                    success:false,

                    message:
                    "Could not load cart."

                });

            }



            let total = 0;



            results.forEach(item=>{

                total +=
                Number(item.price) *
                Number(item.quantity);

            });



            res.json({

                success:true,

                items:results,

                total:total.toFixed(2)

            });


        }

    );


});

// ================================
// UPDATE CART QUANTITY
// PUT /cart/update/:id
// ================================

router.put(
"/cart/update/:id",
authenticateToken,
(req,res)=>{


    const {
        quantity
    } = req.body;


    if(!quantity || quantity < 1){

        return res.status(400).json({

            success:false,
            message:"Invalid quantity."

        });

    }



    const sql = `

        UPDATE cart

        SET quantity = ?

        WHERE id = ?

        AND user_id = ?

    `;



    db.query(

        sql,

        [
            quantity,
            req.params.id,
            req.user.id
        ],

        (err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,
                    message:"Update failed."

                });

            }



            if(result.affectedRows===0){

                return res.status(404).json({

                    success:false,
                    message:"Cart item not found."

                });

            }



            res.json({

                success:true,

                message:
                "Cart quantity updated."

            });


        }

    );


});







// ================================
// REMOVE CART ITEM
// DELETE /cart/remove/:id
// ================================

router.delete(
"/cart/remove/:id",
authenticateToken,
(req,res)=>{


    const sql = `

        DELETE FROM cart

        WHERE id = ?

        AND user_id = ?

    `;



    db.query(

        sql,

        [
            req.params.id,
            req.user.id
        ],

        (err,result)=>{


            if(err){

                return res.status(500).json({

                    success:false,
                    message:"Remove failed."

                });

            }



            if(result.affectedRows===0){

                return res.status(404).json({

                    success:false,
                    message:"Item not found."

                });

            }



            res.json({

                success:true,

                message:
                "Item removed from cart."

            });


        }

    );


});







// ================================
// CLEAR CART
// DELETE /cart/clear
// ================================

router.delete(
"/cart/clear",
authenticateToken,
(req,res)=>{


    db.query(

        `
        DELETE FROM cart
        WHERE user_id = ?
        `,

        [req.user.id],

        (err)=>{


            if(err){

                return res.status(500).json({

                    success:false,
                    message:"Could not clear cart."

                });

            }



            res.json({

                success:true,

                message:
                "Cart cleared."

            });


        }

    );


});

// ================================
// CREATE ORDER FROM CART
// POST /cart/checkout
// ================================

router.post(
"/cart/checkout",
authenticateToken,
(req,res)=>{


    // Get cart items

    db.query(

        `
        SELECT

        cart.product_id,
        cart.quantity,
        products.price

        FROM cart

        INNER JOIN products

        ON cart.product_id = products.id

        WHERE cart.user_id = ?

        `,

        [req.user.id],

        (err,items)=>{


            if(err){

                return res.status(500).json({

                    success:false,
                    message:"Cart error."

                });

            }



            if(items.length===0){

                return res.status(400).json({

                    success:false,
                    message:"Cart is empty."

                });

            }



            let total = 0;


            items.forEach(item=>{

                total +=
                Number(item.price) *
                Number(item.quantity);

            });





            // Create order

            db.query(

                `
                INSERT INTO orders
                (
                    user_id,
                    total_amount
                )

                VALUES(?,?)

                `,

                [
                    req.user.id,
                    total
                ],

                (err,result)=>{


                    if(err){

                        return res.status(500).json({

                            success:false,
                            message:"Order creation failed."

                        });

                    }



                    const orderId =
                    result.insertId;



                    // Save order items

                    const orderItems =
                    items.map(item=>[

                        orderId,
                        item.product_id,
                        item.quantity,
                        item.price

                    ]);



                    db.query(

                        `
                        INSERT INTO order_items
                        (
                            order_id,
                            product_id,
                            quantity,
                            price
                        )

                        VALUES ?

                        `,

                        [
                            orderItems
                        ],

                        (err)=>{


                            if(err){

                                return res.status(500).json({

                                    success:false,
                                    message:
                                    "Order items failed."

                                });

                            }



                            // Clear cart

                            db.query(

                                `
                                DELETE FROM cart
                                WHERE user_id = ?
                                `,

                                [
                                    req.user.id
                                ]

                            );



                            res.json({

                                success:true,

                                message:
                                "Order created.",

                                order_id:
                                orderId,

                                total:
                                total.toFixed(2)

                            });


                        }

                    );


                }

            );


        }

    );


});

module.exports = router;