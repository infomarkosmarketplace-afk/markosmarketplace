const jwt = require("jsonwebtoken");

function adminAuth(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Authorization token required."
        });
    }

    const parts = authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format."
        });
    }

    try {

        const decoded = jwt.verify(
            parts[1],
            process.env.JWT_SECRET
        );

        if (
            !decoded ||
            String(decoded.role || "").toLowerCase() !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }

        req.user = decoded;

        next();

    } catch (err) {

        console.error(
            "ADMIN AUTH ERROR:",
            err.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

module.exports = adminAuth;