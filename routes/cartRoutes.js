const express = require("express");
const router = express.Router();

// ADD TO CART
router.post("/add", (req, res) => {
    const db = req.app.locals.db;
    const { user_id, product_id, quantity } = req.body;

    const sql = `
        INSERT INTO cart_items (user_id, product_id, quantity)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [user_id, product_id, quantity || 1], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to add to cart" });
        }
        res.json({ message: "Item added to cart" });
    });
});

// GET CART ITEMS
router.get("/:user_id", (req, res) => {
    const db = req.app.locals.db;
    const userId = req.params.user_id;

    const sql = `
        SELECT c.id, c.quantity, p.name, p.price, p.image
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to load cart" });
        }
        res.json(results);
    });
});

// REMOVE ITEM
router.delete("/remove/:id", (req, res) => {
    const db = req.app.locals.db;

    db.query("DELETE FROM cart_items WHERE id = ?", [req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to remove item" });
        }
        res.json({ message: "Item removed" });
    });
});

module.exports = router;