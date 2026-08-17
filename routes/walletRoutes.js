const express = require("express");
const router = express.Router();

const db = require("../config/db");

const {
    authenticateToken
} = require("./authRoutes");


// =====================================
// GET SELLER WALLET
// GET /wallet/me
// =====================================

router.get("/me", authenticateToken, (req, res) => {

    const seller_id = req.user.id;


    const sql = `

        SELECT

            balance,
            total_earned,
            total_withdrawn

        FROM seller_wallet

        WHERE seller_id = ?

    `;


    db.query(
        sql,
        [seller_id],
        (err, results) => {

            if(err){

                console.error(err);

                return res.status(500).json({
                    message: "Wallet error"
                });

            }


            if(results.length === 0){

                return res.status(404).json({
                    message: "Wallet not found"
                });

            }


            res.json({

                success:true,

                wallet: results[0]

            });

        }
    );

});


module.exports = router;