const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/auth");

const multer = require("multer");
const path = require("path");


// Profile image upload setup
const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "uploads/");
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + path.extname(file.originalname));
    }

});


const upload = multer({ storage });


// =======================
// GET PROFILE
// =======================
router.get("/", authenticateToken, (req, res) => {

    const db = req.app.locals.db;

    const userId = req.user.id;


    const sql = `
    SELECT 
        id,
        name,
        email,
        phone_number,
        address,
        profile_image,
        created_at
    FROM users
    WHERE id = ?
    `;


    db.query(sql, [userId], (err, results)=>{

        if(err){
            console.log(err);
            return res.status(500).json({
                message:"Database error"
            });
        }


        if(results.length === 0){
            return res.status(404).json({
                message:"User not found"
            });
        }


        res.json(results[0]);

    });

});




// =======================
// SELLER DASHBOARD DATA
// =======================
router.get("/seller", (req,res)=>{

    const db = req.app.locals.db;

    const sellerId = req.query.id;


    const sql = `
    SELECT
        users.name,
        users.email,
        COUNT(products.id) AS total_products

    FROM users

    LEFT JOIN products

    ON users.id = products.seller_id

    WHERE users.id = ?

    GROUP BY users.id
    `;


    db.query(sql,[sellerId],(err,result)=>{

        if(err){
            console.log(err);
            return res.status(500).json(err);
        }


        res.json(result[0]);

    });

});




// =======================
// UPDATE PROFILE
// =======================
router.put("/", authenticateToken, (req,res)=>{

    const db = req.app.locals.db;

    const userId = req.user.id;

    const {
        name,
        phone,
        address
    } = req.body;


    const sql = `
    UPDATE users
    SET name=?, phone=?, address=?
    WHERE id=?
    `;


    db.query(
        sql,
        [name, phone, address, userId],
        (err)=>{

            if(err){
                console.log(err);
                return res.status(500).json({
                    message:"Update failed"
                });
            }


            res.json({
                message:"Profile updated successfully"
            });

        }
    );

});




// =======================
// UPLOAD PROFILE IMAGE
// =======================
router.post("/upload-profile", upload.single("image"), (req,res)=>{

    const db = req.app.locals.db;


    const imageName = req.file.filename;


    db.query(
        "UPDATE users SET profile_image=? WHERE id=?",
        [imageName, req.user.id],
        (err)=>{

            if(err){
                return res.status(500).json({
                    message:"Database error"
                });
            }


            res.json({
                success:true,
                image:imageName
            });

        }
    );

});



module.exports = router;