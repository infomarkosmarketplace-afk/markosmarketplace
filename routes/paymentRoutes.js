const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*

PAYMENT PROOF STORAGE

*/

const uploadDir =
path.join(
__dirname,
"..",
"payment-proofs"
);

if(!fs.existsSync(uploadDir)){

fs.mkdirSync(
    uploadDir,
    {
        recursive:true
    }
);

}

/*

MULTER STORAGE

*/

const storage =
multer.diskStorage({

    destination:
        (req,file,cb)=>{

            cb(
                null,
                uploadDir
            );

        },


    filename:
        (req,file,cb)=>{

            const extension =
                path.extname(
                    file.originalname
                );


            const filename =
                `payment-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;


            cb(
                null,
                filename
            );

        }

});

/*

FILE UPLOAD

*/

const upload =
multer({

    storage:storage,

    limits:{

        fileSize:
            10 * 1024 * 1024

    },


    fileFilter:
        (req,file,cb)=>{

            const allowed = [

                "image/jpeg",
                "image/png",
                "image/jpg"

            ];


            if(
                allowed.includes(
                    file.mimetype
                )
            ){

                cb(
                    null,
                    true
                );

            }

            else{

                cb(
                    new Error(
                        "Only JPG, JPEG and PNG payment receipts are allowed."
                    )
                );

            }

        }

});

/*

UPLOAD PAYMENT RECEIPT

*/

router.post(

"/upload-proof",

authenticateToken,

upload.single("receipt"),

async(req,res)=>{


    let connection;


    try{


        /*
        =================================================
        AUTHENTICATED BUYER
        =================================================
        */

        const buyerId =
            req.user.id;


        const orderId =
            Number(
                req.body.order_id
            );


        /*
        =================================================
        VALIDATE ORDER ID
        =================================================
        */

        if(!orderId){

            if(req.file){

                fs.unlink(
                    req.file.path,
                    ()=>{}
                );

            }


            return res.status(400).json({

                success:false,

                message:
                    "Order ID is required."

            });

        }


        /*
        =================================================
        VALIDATE RECEIPT
        =================================================
        */

        if(!req.file){

            return res.status(400).json({

                success:false,

                message:
                    "Payment receipt is required."

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
        FIND ORDER

        IMPORTANT:

        We use buyer_id from the JWT.

        We do NOT trust buyer_id from the browser.
        =================================================
        */

        const [
            orders
        ] = await connection.query(

            `
            SELECT
                id,
                buyer_id,
                total_amount,
                currency,
                status

            FROM orders

            WHERE id = ?
            AND buyer_id = ?

            LIMIT 1
            `,

            [
                orderId,
                buyerId
            ]

        );


        if(!orders.length){

            await connection.rollback();


            fs.unlink(
                req.file.path,
                ()=>{}
            );


            return res.status(404).json({

                success:false,

                message:
                    "Order not found or does not belong to your account."

            });

        }


        const order =
            orders[0];


        /*
        =================================================
        PREVENT DUPLICATE PAYMENT PROOF
        =================================================
        */

        const [
            existingProof
        ] = await connection.query(

            `
            SELECT
                id,
                status

            FROM payment_proofs

            WHERE order_id = ?

            LIMIT 1
            `,

            [
                orderId
            ]

        );


        if(existingProof.length){

            await connection.rollback();


            fs.unlink(
                req.file.path,
                ()=>{}
            );


            return res.status(409).json({

                success:false,

                message:
                    "Payment proof has already been submitted for this order."

            });

        }


        /*
        =================================================
        GET SELLER(S)
        =================================================

        This verifies that the order actually contains
        valid seller information.
        =================================================
        */

        const [
            sellers
        ] = await connection.query(

            `
            SELECT DISTINCT
                seller_id

            FROM order_items

            WHERE order_id = ?
            `,

            [
                orderId
            ]

        );


        if(!sellers.length){

            await connection.rollback();


            fs.unlink(
                req.file.path,
                ()=>{}
            );


            return res.status(400).json({

                success:false,

                message:
                    "No seller was found for this order."

            });

        }


        /*
        =================================================
        SAVE PAYMENT PROOF
        =================================================
        */

        const receiptPath =
            req.file.path;


        await connection.query(

            `
            INSERT INTO payment_proofs
            (
                order_id,
                buyer_id,
                receipt_image,
                status
            )

            VALUES
            (?, ?, ?, ?)
            `,

            [
                orderId,
                buyerId,
                receiptPath,
                "Pending"
            ]

        );


        /*
        =================================================
        UPDATE ORDER
        =================================================
        */

        await connection.query(

            `
            UPDATE orders

            SET status = ?

            WHERE id = ?

            AND buyer_id = ?
            `,

            [
                "Payment Submitted",
                orderId,
                buyerId
            ]

        );


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

        res.json({

            success:true,

            message:
                "Payment proof submitted successfully. Waiting for verification.",

            order_id:
                orderId,

            payment_status:
                "Pending",

            sellers:
                sellers.map(
                    seller => seller.seller_id
                )

        });


    }

    catch(error){


        console.error(
            "PAYMENT PROOF ERROR:",
            error
        );


        /*
        =================================================
        ROLLBACK
        =================================================
        */

        if(connection){

            try{

                await connection.rollback();

            }

            catch(rollbackError){

                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError
                );

            }

        }


        /*
        =================================================
        DELETE UPLOADED FILE IF DATABASE FAILED
        =================================================
        */

        if(req.file){

            fs.unlink(
                req.file.path,
                ()=>{
                    /* File cleanup */
                }
            );

        }


        /*
        =================================================
        ERROR RESPONSE
        =================================================
        */

        res.status(500).json({

            success:false,

            message:
                error.message ||
                "Payment proof upload failed."

        });

    }


    finally{

        if(connection){

            connection.release();

        }

    }

}

);

/*

MULTER / UPLOAD ERROR HANDLER

*/

router.use(

(error,req,res,next)=>{

    console.error(
        "PAYMENT UPLOAD ERROR:",
        error
    );


    if(error){

        return res.status(400).json({

            success:false,

            message:
                error.message ||
                "Payment receipt upload failed."

        });

    }


    next();

}

);

module.exports = router;