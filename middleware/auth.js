const jwt = require("jsonwebtoken");

/*
=========================================================
AUTHENTICATION MIDDLEWARE
=========================================================

Expected header:

Authorization: Bearer YOUR_JWT_TOKEN

This middleware:

1. Reads the Authorization header
2. Extracts the Bearer token
3. Verifies the JWT
4. Places the decoded user in req.user
5. Allows the protected route to continue
=========================================================
*/

function authenticateToken(req, res, next) {

    try {

        /*
        =================================================
        GET AUTHORIZATION HEADER
        =================================================
        */

        const authHeader =
            req.headers.authorization ||
            req.headers.Authorization;


        /*
        =================================================
        NO AUTHORIZATION HEADER
        =================================================
        */

        if (!authHeader) {

            return res.status(401).json({

                success: false,

                message:
                    "Access token required"

            });

        }


        /*
        =================================================
        EXTRACT BEARER TOKEN
        =================================================
        */

        let token;


        if (
            typeof authHeader === "string" &&
            authHeader.toLowerCase().startsWith("bearer ")
        ) {

            token =
                authHeader.substring(7).trim();

        }


        /*
        =================================================
        INVALID AUTHORIZATION FORMAT
        =================================================
        */

        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Access token required"

            });

        }


        /*
        =================================================
        JWT SECRET
        =================================================

        Use the same secret that was used when
        the token was created during login.
        */

        const secret =
            process.env.JWT_SECRET;


        if (!secret) {

            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({

                success: false,

                message:
                    "Authentication configuration error."

            });

        }


        /*
        =================================================
        VERIFY TOKEN
        =================================================
        */

        jwt.verify(
            token,
            secret,
            (error, decoded) => {

                if (error) {

                    console.error(
                        "JWT VERIFY ERROR:",
                        error.message
                    );


                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid or expired access token."

                    });

                }


                /*
                =========================================
                SAVE USER INFORMATION
                =========================================
                */

                req.user =
                    decoded;


                /*
                =========================================
                CONTINUE TO ROUTE
                =========================================
                */

                next();

            }
        );

    }

    catch (error) {

        console.error(
            "AUTHENTICATION ERROR:",
            error
        );


        return res.status(401).json({

            success: false,

            message:
                "Authentication failed."

        });

    }

}


module.exports =
    authenticateToken;