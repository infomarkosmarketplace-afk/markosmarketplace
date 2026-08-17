const express = require("express");
const router = express.Router();

const https = require("https");
const db = require("../config/db");

/*
============================================================
MARKO'S MARKETPLACE
LIVE EXCHANGE RATE SYSTEM

BASE CURRENCY:
USD

LIVE PROVIDER:
ExchangeRate-API Open Endpoint

FEATURES:
- Live USD exchange rates
- MySQL storage
- Previous rate tracking
- Increase/decrease calculation
- Percentage movement
- Automatic 15-minute updates
- Manual update endpoint
============================================================
*/


/*
============================================================
SUPPORTED CURRENCIES
============================================================
*/

const currencies = {

    USD: {
        name: "US Dollar",
        symbol: "$"
    },

    NAD: {
        name: "Namibian Dollar",
        symbol: "N$"
    },

    ZAR: {
        name: "South African Rand",
        symbol: "R"
    },

    EUR: {
        name: "Euro",
        symbol: "€"
    },

    GBP: {
        name: "British Pound",
        symbol: "£"
    },

    BWP: {
        name: "Botswana Pula",
        symbol: "P"
    },

    AUD: {
        name: "Australian Dollar",
        symbol: "A$"
    },

    CAD: {
        name: "Canadian Dollar",
        symbol: "C$"
    },

    CHF: {
        name: "Swiss Franc",
        symbol: "CHF"
    },

    CNY: {
        name: "Chinese Yuan",
        symbol: "¥"
    },

    JPY: {
        name: "Japanese Yen",
        symbol: "¥"
    },

    INR: {
        name: "Indian Rupee",
        symbol: "₹"
    },

    BRL: {
        name: "Brazilian Real",
        symbol: "R$"
    },

    MXN: {
        name: "Mexican Peso",
        symbol: "$"
    },

    SGD: {
        name: "Singapore Dollar",
        symbol: "S$"
    },

    NZD: {
        name: "New Zealand Dollar",
        symbol: "NZ$"
    }

};


/*
============================================================
GET LIVE RATES FROM PROVIDER
============================================================
*/

function getLiveRates() {

    return new Promise((resolve, reject) => {

        const url =
            "https://open.er-api.com/v6/latest/USD";


        https.get(url, response => {

            let data = "";


            response.on("data", chunk => {

                data += chunk;

            });


            response.on("end", () => {

                try {

                    const result =
                        JSON.parse(data);


                    if (
                        result.result !== "success" ||
                        !result.rates
                    ) {

                        return reject(
                            new Error(
                                "Live exchange-rate provider returned an invalid response."
                            )
                        );

                    }


                    resolve(result);

                }

                catch (error) {

                    reject(error);

                }

            });

        })

        .on("error", error => {

            reject(error);

        });

    });

}


/*
============================================================
UPDATE DATABASE
============================================================
*/

async function updateExchangeRates() {

    console.log(
        "Updating live exchange rates..."
    );


    const liveData =
        await getLiveRates();


    const rates =
        liveData.rates;


    const baseCurrency =
        "USD";


    /*
    --------------------------------------------------------
    USD always equals 1
    --------------------------------------------------------
    */

    rates.USD = 1;


    for (
        const currencyCode
        of Object.keys(currencies)
    ) {


        const currentRate =
            Number(
                rates[currencyCode]
            );


        /*
        ----------------------------------------------------
        Skip invalid currencies
        ----------------------------------------------------
        */

        if (
            !Number.isFinite(currentRate) ||
            currentRate <= 0
        ) {

            console.log(
                `Skipping ${currencyCode}: invalid rate`
            );

            continue;

        }


        /*
        ----------------------------------------------------
        Find existing record
        ----------------------------------------------------
        */

        const [rows] =
            await db.promise().query(

                `
                SELECT
                    exchange_rate
                FROM exchange_rates
                WHERE base_currency = ?
                AND currency_code = ?
                LIMIT 1
                `,

                [
                    baseCurrency,
                    currencyCode
                ]

            );


        let previousRate = null;

        let change = null;

        let changePercent = null;


        /*
        ----------------------------------------------------
        Existing currency
        ----------------------------------------------------
        */

        if (rows.length > 0) {


            previousRate =
                Number(
                    rows[0].exchange_rate
                );


            if (
                Number.isFinite(previousRate) &&
                previousRate > 0
            ) {


                change =
                    currentRate -
                    previousRate;


                changePercent =
                    (
                        change /
                        previousRate
                    ) * 100;

            }

        }


        /*
        ----------------------------------------------------
        Insert / Update
        ----------------------------------------------------
        */

        await db.promise().query(

            `
            INSERT INTO exchange_rates
            (
                base_currency,
                currency_code,
                currency_name,
                currency_symbol,
                exchange_rate,
                previous_rate,
                rate_change,
                change_percent,
                last_updated
            )

            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                NOW()
            )

            ON DUPLICATE KEY UPDATE

                previous_rate =
                    exchange_rate,

                exchange_rate =
                    VALUES(exchange_rate),

                rate_change =
                    VALUES(rate_change),

                change_percent =
                    VALUES(change_percent),

                currency_name =
                    VALUES(currency_name),

                currency_symbol =
                    VALUES(currency_symbol),

                last_updated =
                    NOW()
            `,

            [
                baseCurrency,

                currencyCode,

                currencies[currencyCode].name,

                currencies[currencyCode].symbol,

                currentRate,

                previousRate,

                change,

                changePercent
            ]

        );

    }


    console.log(
        "Live exchange rates updated successfully."
    );

}


/*
============================================================
GET /exchange-rates
============================================================

IMPORTANT:
This endpoint reads the latest stored rates.

It does NOT call the external provider every time
someone opens the page.
============================================================
*/

router.get("/", async (req, res) => {

    try {


        const [rates] =
            await db.promise().query(

                `
                SELECT

                    id,

                    base_currency,

                    currency_code,

                    currency_name,

                    currency_symbol,

                    exchange_rate,

                    previous_rate,

                    rate_change AS change,

                    change_percent,

                    last_updated

                FROM exchange_rates

                WHERE base_currency = 'USD'

                ORDER BY
                    currency_code ASC
                `

            );


        res.json({

            success: true,

            base_currency: "USD",

            updated_at:
                rates.length
                    ? rates[0].last_updated
                    : null,

            rates

        });

    }

    catch (error) {


        console.error(
            "Exchange rate database error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to retrieve exchange rates."

        });

    }

});


/*
============================================================
POST /exchange-rates/update

MANUAL UPDATE
============================================================
*/

router.post("/update", async (req, res) => {

    try {


        await updateExchangeRates();


        res.json({

            success: true,

            message:
                "Live exchange rates updated successfully."

        });

    }

    catch (error) {


        console.error(
            "Manual exchange-rate update error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to update live exchange rates."

        });

    }

});


/*
============================================================
AUTOMATIC UPDATE
============================================================

Update rates immediately when the server starts.

Then update every 15 minutes.

15 minutes = 900,000 milliseconds.
============================================================
*/

async function startAutomaticExchangeRateUpdates() {

    try {

        await updateExchangeRates();

    }

    catch (error) {

        console.error(
            "Initial exchange-rate update failed:",
            error
        );

    }


    setInterval(
        async () => {

            try {

                await updateExchangeRates();

            }

            catch (error) {

                console.error(
                    "Automatic exchange-rate update failed:",
                    error
                );

            }

        },

        15 * 60 * 1000

    );

}


/*
============================================================
START AUTOMATIC SYSTEM
============================================================
*/

startAutomaticExchangeRateUpdates();


/*
============================================================
EXPORT ROUTER
============================================================
*/

module.exports = router;