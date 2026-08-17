const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config();

const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "marketplace",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================================================
// JWT CONFIGURATION
// =====================================================

const JWT_SECRET =
    process.env.JWT_SECRET || "marketplace_super_secret_2026";

const JWT_EXPIRES_IN = "7d";


// =====================================================
// MULTER - PROFILE IMAGES
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "public/uploads/profiles/");

    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});


const upload = multer({

    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowed =
            /jpg|jpeg|png|gif|webp/;

        const ext =
            allowed.test(
                path.extname(file.originalname)
                    .toLowerCase()
            );

        const mime =
            allowed.test(file.mimetype);

        if (ext && mime) {

            return cb(null, true);

        }

        cb(
            new Error(
                "Only image files are allowed."
            )
        );

    }

});


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    const token =
        authHeader &&
        authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;


    if (!token) {

        return res.status(401).json({

            success: false,

            message:
                "Administrator authentication required."

        });

    }


    jwt.verify(
        token,
        JWT_SECRET,
        (err, user) => {

            if (err) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Invalid or expired token."

                });

            }


            req.user = user;

            next();

        }
    );

}


// =====================================================
// ROLE AUTHORIZATION
// =====================================================

function authorizeRoles(...roles) {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        if (!roles.includes(req.user.role)) {

            return res.status(403).json({

                success: false,

                message:
                    "Permission denied."

            });

        }


        next();

    };

}


// =====================================================
// ADMIN AUTHORIZATION
// =====================================================

function authorizeAdmin(req, res, next) {

    if (!req.user) {

        return res.status(401).json({

            success: false,

            message:
                "Authentication required."

        });

    }


    if (
        req.user.role !== "admin" &&
        Number(req.user.is_admin) !== 1
    ) {

        return res.status(403).json({

            success: false,

            message:
                "Administrator access required."

        });

    }


    next();

}


// =====================================================
// RANDOM TOKEN
// =====================================================

function generateToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


// =====================================================
// REGISTER
// POST /auth/register
// =====================================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            phone_number,
            password,
            role
        } = req.body;


        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, email and password are required."

            });

        }


        // ---------------------------------------------
        // USERS ARE NEVER ALLOWED TO REGISTER AS ADMIN
        // ---------------------------------------------

        let accountRole = "buyer";

        if (role === "seller") {

            accountRole = "seller";

        }


        const hashedPassword =
            await bcrypt.hash(password, 10);


        const sql = `

            INSERT INTO users
            (
                name,
                email,
                phone_number,
                password,
                role,
                is_admin
            )

            VALUES (?, ?, ?, ?, ?, 0)

        `;


        db.query(

            sql,

            [
                name,
                email,
                phone_number || null,
                hashedPassword,
                accountRole
            ],

            (err, result) => {

                if (err) {

                    console.error(
                        "REGISTER ERROR:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Registration failed."

                    });

                }


                // =============================================
                // AUTOMATIC SELLER WALLET
                // =============================================

                if (accountRole === "seller") {

                    const sellerId =
                        result.insertId;


                    db.query(

                        `
                        INSERT INTO seller_wallet
                        (
                            seller_id,
                            balance,
                            total_earned,
                            total_withdrawn
                        )
                        VALUES (?, 0, 0, 0)

                        ON DUPLICATE KEY UPDATE
                            seller_id = seller_id
                        `,

                        [sellerId],

                        (walletErr) => {

                            if (walletErr) {

                                console.error(
                                    "SELLER WALLET CREATION ERROR:",
                                    walletErr
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Account created, but seller wallet could not be created."

                                });

                            }


                            // =============================================
                            // CREATE JWT FOR NEW SELLER
                            // =============================================

                            const token = jwt.sign(

                                {

                                    id: sellerId,

                                    email: email,

                                    role: "seller",

                                    is_admin: 0

                                },

                                JWT_SECRET,

                                {

                                    expiresIn:
                                        JWT_EXPIRES_IN

                                }

                            );


                            // =============================================
                            // SELLER REGISTRATION SUCCESS
                            // =============================================

                            return res.json({

                                success: true,

                                message:
                                    "Seller account and wallet created successfully.",

                                token: token,

                                redirect:
                                    "seller-dashboard.html"

                            });

                        }

                    );

                    return;

                }


                // =============================================
                // BUYER REGISTRATION
                // =============================================

                res.json({

                    success: true,

                    message:
                        "Account created successfully."

                });

            }

        );


    } catch (error) {

        console.error(
            "REGISTER SERVER ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Server error."

        });

    }

});


// =====================================================
// LOGIN
// POST /auth/login
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        const sql = `

            SELECT *

            FROM users

            WHERE email = ?

            LIMIT 1

        `;


        db.query(

            sql,

            [email],

            async (err, results) => {

                if (err) {

                    console.error(
                        "LOGIN DATABASE ERROR:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error."

                    });

                }


                if (results.length === 0) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid email or password."

                    });

                }


                const user = results[0];


                // -----------------------------------------
                // ACCOUNT STATUS
                // -----------------------------------------

                if (
                    user.status &&
                    user.status !== "active"
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Account is not active."

                    });

                }


                // -----------------------------------------
                // ACCOUNT LOCK
                // -----------------------------------------

                if (

                    user.account_locked_until &&

                    new Date(
                        user.account_locked_until
                    ) > new Date()

                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Account temporarily locked. Try again later."

                    });

                }


                // -----------------------------------------
                // PASSWORD
                // -----------------------------------------

                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );


                if (!passwordMatch) {

                    const attempts =
                        Number(
                            user.failed_login_attempts || 0
                        ) + 1;


                    let lockTime = null;


                    if (attempts >= 5) {

                        lockTime =
                            new Date(
                                Date.now() +
                                15 * 60 * 1000
                            );

                    }


                    db.query(

                        `
                        UPDATE users

                        SET
                            failed_login_attempts = ?,
                            account_locked_until = NULL

                        WHERE id = ?
                        `,

                        [
                            attempts,
                            user.id
                        ]

                    );


                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid email or password."

                    });

                }


                // -----------------------------------------
                // SUCCESSFUL LOGIN
                // -----------------------------------------

                db.query(

                    `
                    UPDATE users

                    SET
                        failed_login_attempts = 0,
                        account_locked_until = NULL,
                        last_login = NOW()

                    WHERE id = ?
                    `,

                    [user.id]

                );


                // =================================================
                // IMPORTANT:
                //
                // is_admin = 1 ALWAYS OVERRIDES buyer/seller ROLE
                // =================================================

                const isAdmin =
                    Number(user.is_admin) === 1;


                let userRole;


                if (isAdmin) {

                    userRole = "admin";

                } else if (user.role === "seller") {

                    userRole = "seller";

                } else {

                    userRole = "buyer";

                }


                // -----------------------------------------
                // CREATE JWT
                // -----------------------------------------

                const token =
                    jwt.sign(

                        {

                            id: user.id,

                            email: user.email,

                            role: userRole,

                            is_admin:
                                isAdmin ? 1 : 0

                        },

                        JWT_SECRET,

                        {

                            expiresIn:
                                JWT_EXPIRES_IN

                        }

                    );


                // -----------------------------------------
                // REDIRECT
                // -----------------------------------------

                let redirect;


                if (userRole === "admin") {

                    redirect =
                        "admin.html";

                } else if (
                    userRole === "seller"
                ) {

                    redirect =
                        "seller-dashboard.html";

                } else {

                    redirect =
                        "index.html";

                }


                console.log(
                    "LOGIN:",
                    user.email,
                    "| role:",
                    userRole,
                    "| is_admin:",
                    isAdmin
                );


                res.json({

                    success: true,

                    message:
                        "Login successful.",

                    token,

                    redirect,

                    user: {

                        id: user.id,

                        name: user.name,

                        email: user.email,

                        role: userRole,

                        is_admin:
                            isAdmin ? 1 : 0

                    }

                });

            }

        );


    } catch (error) {

        console.error(
            "LOGIN SERVER ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

});


// =====================================================
// GET CURRENT USER
// GET /auth/me
// =====================================================

router.get(
    "/me",
    authenticateToken,
    (req, res) => {

        const sql = `

            SELECT
                id,
                name,
                email,
                phone_number,
                role,
                is_admin,
                profile_image,
                status,
                is_verified,
                created_at

            FROM users

            WHERE id = ?

            LIMIT 1

        `;


        db.query(

            sql,

            [req.user.id],

            (err, results) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error."

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "User not found."

                    });

                }


                const user =
                    results[0];


                // is_admin determines actual admin status

                const actualRole =
                    Number(user.is_admin) === 1
                        ? "admin"
                        : user.role;


                res.json({

                    success: true,

                    user: {

                        ...user,

                        role: actualRole,

                        is_admin:
                            Number(user.is_admin) === 1
                                ? 1
                                : 0

                    }

                });

            }

        );

    }
);


// =====================================================
// UPDATE PROFILE
// PUT /auth/profile
// =====================================================

router.put(
    "/profile",
    authenticateToken,
    (req, res) => {

        const {
            name,
            phone_number
        } = req.body;


        if (
            phone_number &&
            !phone_number.startsWith("+")
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Phone number must include country code."

            });

        }


        const sql = `

            UPDATE users

            SET
                name = COALESCE(?, name),
                phone_number = COALESCE(?, phone_number)

            WHERE id = ?

        `;


        db.query(

            sql,

            [
                name || null,
                phone_number || null,
                req.user.id
            ],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Profile update failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Profile updated successfully."

                });

            }

        );

    }
);


// =====================================================
// UPLOAD PROFILE IMAGE
// PUT /auth/profile-image
// =====================================================

router.put(

    "/profile-image",

    authenticateToken,

    upload.single("profile_image"),

    (req, res) => {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "No image uploaded."

            });

        }


        const imagePath =
            "/uploads/profiles/" +
            req.file.filename;


        db.query(

            `
            UPDATE users

            SET profile_image = ?

            WHERE id = ?
            `,

            [
                imagePath,
                req.user.id
            ],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Image update failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Profile picture updated.",

                    image:
                        imagePath

                });

            }

        );

    }

);


// =====================================================
// LOGOUT
// POST /auth/logout
// =====================================================

router.post(
    "/logout",
    authenticateToken,
    (req, res) => {

        res.json({

            success: true,

            message:
                "Logged out successfully."

        });

    }
);


// =====================================================
// CHANGE PASSWORD
// PUT /auth/change-password
// =====================================================

router.put(
    "/change-password",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;


            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Both passwords are required."

                });

            }


            db.query(

                `
                SELECT password

                FROM users

                WHERE id = ?

                LIMIT 1
                `,

                [req.user.id],

                async (err, results) => {

                    if (err) {

                        return res.status(500).json({

                            success: false,

                            message:
                                "Database error."

                        });

                    }


                    if (!results.length) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "User not found."

                        });

                    }


                    const match =
                        await bcrypt.compare(
                            currentPassword,
                            results[0].password
                        );


                    if (!match) {

                        return res.status(401).json({

                            success: false,

                            message:
                                "Current password is incorrect."

                        });

                    }


                    const hashed =
                        await bcrypt.hash(
                            newPassword,
                            10
                        );


                    db.query(

                        `
                        UPDATE users

                        SET password = ?

                        WHERE id = ?
                        `,

                        [
                            hashed,
                            req.user.id
                        ],

                        (updateErr) => {

                            if (updateErr) {

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Password update failed."

                                });

                            }


                            res.json({

                                success: true,

                                message:
                                    "Password changed successfully."

                            });

                        }

                    );

                }

            );


        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// =====================================================
// FORGOT PASSWORD
// POST /auth/forgot-password
// =====================================================

router.post(
    "/forgot-password",
    (req, res) => {

        const { email } =
            req.body;


        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Email is required."

            });

        }


        const token =
            generateToken();


        const expiry =
            new Date(
                Date.now() +
                15 * 60 * 1000
            );


        db.query(

            `
            UPDATE users

            SET
                password_reset_token = ?,
                password_reset_expires = ?

            WHERE email = ?
            `,

            [
                token,
                expiry,
                email
            ],

            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Password reset token created.",

                    token

                });

            }

        );

    }
);


// =====================================================
// RESET PASSWORD
// POST /auth/reset-password
// =====================================================

router.post(
    "/reset-password",
    async (req, res) => {

        try {

            const {
                token,
                newPassword
            } = req.body;


            if (!token || !newPassword) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Token and new password are required."

                });

            }


            db.query(

                `
                SELECT id

                FROM users

                WHERE
                    password_reset_token = ?

                    AND password_reset_expires > NOW()

                LIMIT 1
                `,

                [token],

                async (err, results) => {

                    if (err) {

                        return res.status(500).json({

                            success: false,

                            message:
                                "Database error."

                        });

                    }


                    if (!results.length) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Invalid or expired token."

                        });

                    }


                    const hashed =
                        await bcrypt.hash(
                            newPassword,
                            10
                        );


                    db.query(

                        `
                        UPDATE users

                        SET
                            password = ?,
                            password_reset_token = NULL,
                            password_reset_expires = NULL

                        WHERE id = ?
                        `,

                        [
                            hashed,
                            results[0].id
                        ],

                        (updateErr) => {

                            if (updateErr) {

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Password reset failed."

                                });

                            }


                            res.json({

                                success: true,

                                message:
                                    "Password reset successful."

                            });

                        }

                    );

                }

            );


        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// =====================================================
// VERIFY EMAIL
// GET /auth/verify-email/:token
// =====================================================

router.get(
    "/verify-email/:token",
    (req, res) => {

        const token =
            req.params.token;


        db.query(

            `
            UPDATE users

            SET
                is_verified = 1,
                email_verification_token = NULL

            WHERE email_verification_token = ?
            `,

            [token],

            (err, result) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Verification failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Email verified successfully."

                });

            }

        );

    }

);


// =====================================================
// RESEND VERIFICATION
// POST /auth/resend-verification
// =====================================================

router.post(
    "/resend-verification",
    (req, res) => {

        const { email } =
            req.body;


        const token =
            generateToken();


        db.query(

            `
            UPDATE users

            SET email_verification_token = ?

            WHERE email = ?
            `,

            [
                token,
                email
            ],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not generate token."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Verification token generated.",

                    token

                });

            }

        );

    }

);


// =====================================================
// DELETE ACCOUNT
// DELETE /auth/delete-account
// =====================================================

router.delete(
    "/delete-account",
    authenticateToken,
    (req, res) => {

        db.query(

            `
            DELETE FROM users

            WHERE id = ?
            `,

            [req.user.id],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Account deletion failed."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Account deleted successfully."

                });

            }

        );

    }
);


// =====================================================
// REFRESH TOKEN
// POST /auth/refresh-token
// =====================================================

router.post(
    "/refresh-token",
    (req, res) => {

        const { token } =
            req.body;


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Token required."

            });

        }


        jwt.verify(

            token,

            JWT_SECRET,

            (err, user) => {

                if (err) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Invalid token."

                    });

                }


                const newToken =
                    jwt.sign(

                        {

                            id: user.id,

                            email: user.email,

                            role: user.role,

                            is_admin:
                                Number(
                                    user.is_admin
                                ) === 1
                                    ? 1
                                    : 0

                        },

                        JWT_SECRET,

                        {

                            expiresIn:
                                JWT_EXPIRES_IN

                        }

                    );


                res.json({

                    success: true,

                    token:
                        newToken

                });

            }

        );

    }

);


// =====================================================
// LOGIN HISTORY
// POST /auth/login-history
// =====================================================

router.post(
    "/login-history",
    authenticateToken,
    (req, res) => {

        db.query(

            `
            INSERT INTO login_history
            (
                user_id,
                ip_address,
                user_agent
            )

            VALUES (?, ?, ?)
            `,

            [
                req.user.id,
                req.ip,
                req.headers["user-agent"]
            ],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not save history."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Login history saved."

                });

            }

        );

    }

);


// =====================================================
// UPDATE ROLE
// PUT /auth/update-role
// =====================================================

router.put(
    "/update-role",
    authenticateToken,
    (req, res) => {

        const { role } =
            req.body;


        // ADMIN ACCOUNTS CANNOT BE CHANGED
        if (
            Number(req.user.is_admin) === 1 ||
            req.user.role === "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Administrator account cannot change role."

            });

        }


        if (
            role !== "buyer" &&
            role !== "seller"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid account type."

            });

        }


        db.query(

            `
            UPDATE users

            SET role = ?

            WHERE id = ?
            `,

            [
                role,
                req.user.id
            ],

            (err) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error."

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Account type saved successfully."

                });

            }

        );

    }

);


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    router,

    authenticateToken,

    authorizeRoles,

    authorizeAdmin

};