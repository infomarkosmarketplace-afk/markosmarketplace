const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const upload = require("../middleware/upload");
const db = require("../config/db");
const authenticateToken = require("../middleware/auth");


// =====================================================
// HELPER — GET LOGGED-IN USER ID
// =====================================================

function getSellerId(req) {

    return (
        req.user?.id ||
        req.user?.user_id ||
        req.user?.seller_id
    );

}


// =====================================================
// HELPER — CHECK SELLER
// =====================================================

function isSeller(req) {

    return req.user?.role === "seller";

}


// =====================================================
// UPLOAD PRODUCT
// =====================================================

router.post(
    "/upload",
    authenticateToken,
    upload.array("images", 20),

    async (req, res) => {

        try {

            console.log("=================================");
            console.log("PRODUCT UPLOAD");
            console.log("BODY:", req.body);
            console.log("FILES:", req.files);
            console.log("USER:", req.user);
            console.log("=================================");


            if (!isSeller(req)) {

                return res.status(403).json({
                    success: false,
                    message: "Only sellers can upload products."
                });

            }


            const sellerId = getSellerId(req);


            if (!sellerId) {

                return res.status(401).json({
                    success: false,
                    message: "Seller ID not found. Please log in again."
                });

            }


            const {
                product_name,
                description,
                price,
                stock,
                category
            } = req.body;


            // =================================================
            // VALIDATE PRODUCT NAME
            // =================================================

            if (
                !product_name ||
                !product_name.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Product name is required."
                });

            }


            // =================================================
            // VALIDATE PRICE
            // =================================================

            const productPrice =
                Number(price);


            if (
                !Number.isFinite(productPrice) ||
                productPrice <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Enter a valid product price."
                });

            }


            // =================================================
            // VALIDATE STOCK
            // =================================================

            const productStock =
                Number(stock);


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Enter a valid stock quantity."
                });

            }


            // =================================================
            // PRODUCT IMAGES
            // =================================================

            const images =
                req.files
                    ? req.files.map(
                        file => file.filename
                    )
                    : [];


            if (images.length === 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please upload at least one product image."
                });

            }


            // =================================================
            // INSERT PRODUCT
            // =================================================

            const sql = `
                INSERT INTO products
                (
                    seller_id,
                    product_name,
                    title,
                    description,
                    price,
                    category,
                    image,
                    stock
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;


            const [result] =
                await db.query(
                    sql,
                    [
                        sellerId,
                        product_name.trim(),
                        product_name.trim(),
                        description
                            ? description.trim()
                            : "",
                        productPrice,
                        category || "Other",
                        JSON.stringify(images),
                        productStock
                    ]
                );


            console.log(
                "PRODUCT CREATED:",
                result.insertId
            );


            return res.status(201).json({

                success: true,

                message:
                    "Product uploaded successfully.",

                productId:
                    result.insertId,

                sellerId,

                images

            });


        }

        catch (error) {

            console.error(
                "PRODUCT UPLOAD ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error while uploading product.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET ALL PRODUCTS
// =====================================================

router.get(
    "/",
    async (req, res) => {

        try {

            const [rows] =
                await db.query(`
                    SELECT
                        id,
                        title,
                        product_name,
                        description,
                        price,
                        category,
                        image,
                        views,
                        seller_id,
                        stock
                    FROM products
                    ORDER BY id DESC
                `);


            return res.json({

                success: true,

                products: rows

            });


        }

        catch (error) {

            console.error(
                "GET PRODUCTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load products.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET PRODUCTS FOR LOGGED-IN SELLER
// =====================================================
// IMPORTANT:
// Seller dashboard should use:
// GET /products/seller
//
// This is safer than trusting seller ID from the URL.
// =====================================================

router.get(
    "/seller",
    authenticateToken,

    async (req, res) => {

        try {

            if (!isSeller(req)) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only sellers can access seller products."

                });

            }


            const sellerId =
                getSellerId(req);


            if (!sellerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Seller ID not found."

                });

            }


            const [rows] =
                await db.query(`

                    SELECT
                        id,
                        title,
                        product_name,
                        description,
                        price,
                        category,
                        image,
                        views,
                        seller_id,
                        stock
                    FROM products
                    WHERE seller_id = ?
                    ORDER BY id DESC

                `, [sellerId]);


            return res.json({

                success: true,

                products: rows

            });


        }

        catch (error) {

            console.error(
                "GET SELLER PRODUCTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load seller products.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET PRODUCTS FOR SPECIFIC SELLER
// =====================================================

router.get(
    "/seller/:id",

    async (req, res) => {

        try {

            const sellerId =
                Number(req.params.id);


            if (
                !Number.isInteger(sellerId) ||
                sellerId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid seller ID."

                });

            }


            const [rows] =
                await db.query(`

                    SELECT
                        id,
                        title,
                        product_name,
                        description,
                        price,
                        category,
                        image,
                        views,
                        seller_id,
                        stock
                    FROM products
                    WHERE seller_id = ?
                    ORDER BY id DESC

                `, [sellerId]);


            return res.json({

                success: true,

                products: rows

            });


        }

        catch (error) {

            console.error(
                "GET SELLER PRODUCTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load seller products.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET SINGLE PRODUCT
// =====================================================

router.get(
    "/:id",

    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            const [rows] =
                await db.query(`

                    SELECT
                        id,
                        title,
                        product_name,
                        description,
                        price,
                        category,
                        image,
                        views,
                        seller_id,
                        stock
                    FROM products
                    WHERE id = ?
                    LIMIT 1

                `, [productId]);


            if (!rows.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found."

                });

            }


            return res.json({

                success: true,

                product: rows[0]

            });


        }

        catch (error) {

            console.error(
                "GET PRODUCT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load product.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// EDIT PRODUCT
// =====================================================

router.put(
    "/:id",
    authenticateToken,

    async (req, res) => {

        try {

            if (!isSeller(req)) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only sellers can edit products."

                });

            }


            const sellerId =
                getSellerId(req);


            const productId =
                Number(req.params.id);


            if (!sellerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Seller ID not found."

                });

            }


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            const {
                product_name,
                description,
                price,
                stock,
                category
            } = req.body;


            if (
                !product_name ||
                !product_name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required."

                });

            }


            const productPrice =
                Number(price);


            const productStock =
                Number(stock);


            if (
                !Number.isFinite(productPrice) ||
                productPrice <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a valid price."

                });

            }


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a valid stock quantity."

                });

            }


            // =================================================
            // OWNERSHIP CHECK
            // =================================================

            const [existing] =
                await db.query(`

                    SELECT id
                    FROM products
                    WHERE id = ?
                    AND seller_id = ?
                    LIMIT 1

                `, [
                    productId,
                    sellerId
                ]);


            if (!existing.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found or you do not own it."

                });

            }


            // =================================================
            // UPDATE
            // =================================================

            await db.query(`

                UPDATE products

                SET
                    product_name = ?,
                    title = ?,
                    description = ?,
                    price = ?,
                    category = ?,
                    stock = ?

                WHERE id = ?
                AND seller_id = ?

            `, [

                product_name.trim(),

                product_name.trim(),

                description
                    ? description.trim()
                    : "",

                productPrice,

                category || "Other",

                productStock,

                productId,

                sellerId

            ]);


            return res.json({

                success: true,

                message:
                    "Product updated successfully."

            });


        }

        catch (error) {

            console.error(
                "EDIT PRODUCT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update product.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// DELETE PRODUCT
// =====================================================

router.delete(
    "/:id",
    authenticateToken,

    async (req, res) => {

        try {

            if (!isSeller(req)) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only sellers can delete products."

                });

            }


            const sellerId =
                getSellerId(req);


            const productId =
                Number(req.params.id);


            if (!sellerId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Seller ID not found."

                });

            }


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID."

                });

            }


            // =================================================
            // GET PRODUCT FIRST
            // =================================================

            const [rows] =
                await db.query(`

                    SELECT
                        id,
                        image
                    FROM products

                    WHERE id = ?
                    AND seller_id = ?

                    LIMIT 1

                `, [
                    productId,
                    sellerId
                ]);


            if (!rows.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found or you do not own it."

                });

            }


            const product =
                rows[0];


            // =================================================
            // DELETE DATABASE RECORD
            // =================================================

            await db.query(`

                DELETE FROM products

                WHERE id = ?
                AND seller_id = ?

            `, [
                productId,
                sellerId
            ]);


            // =================================================
            // DELETE PRODUCT IMAGES
            // =================================================

            let images = [];


            try {

                if (
                    Array.isArray(product.image)
                ) {

                    images =
                        product.image;

                }

                else if (
                    product.image
                ) {

                    images =
                        JSON.parse(
                            product.image
                        );

                }

            }

            catch (imageError) {

                console.error(
                    "IMAGE JSON ERROR:",
                    imageError
                );

            }


            images.forEach(filename => {

                if (!filename) {
                    return;
                }


                const imagePath =
                    path.join(
                        __dirname,
                        "..",
                        "uploads",
                        filename
                    );


                fs.unlink(
                    imagePath,
                    error => {

                        if (error &&
                            error.code !== "ENOENT") {

                            console.error(
                                "IMAGE DELETE ERROR:",
                                error
                            );

                        }

                    }
                );

            });


            return res.json({

                success: true,

                message:
                    "Product deleted successfully."

            });


        }

        catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete product.",

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