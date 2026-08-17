const mysql = require("mysql2/promise");

// ================================
// MYSQL DATABASE CONNECTION POOL
// ================================

const db = mysql.createPool({

    host: "localhost",

    user: "root",

    password: "",

    database: "marketplace",

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});

console.log("MySQL Database Pool Ready");

module.exports = db;