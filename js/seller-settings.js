// =====================================================
// MARKO'S MARKETPLACE
// SELLER PAYMENT & DELIVERY SETTINGS
// =====================================================

const token = localStorage.getItem("token");

// =====================================================
// AUTHENTICATION
// =====================================================

if (!token) {
    window.location.href = "login.html";
    throw new Error("No authentication token.");
}

let seller;

try {
    seller = JSON.parse(atob(token.split(".")[1]));
} catch (error) {
    console.error("Invalid token:", error);
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

if (!seller || seller.role !== "seller") {
    window.location.href = "index.html";
}


// =====================================================
// ELEMENTS
// =====================================================

const paymentForm =
    document.getElementById("paymentForm");

const deliveryForm =
    document.getElementById("deliveryForm");

const paymentMessage =
    document.getElementById("paymentMessage");

const deliveryMessage =
    document.getElementById("deliveryMessage");


// =====================================================
// MESSAGE HELPER
// =====================================================

function showMessage(element, message, type) {

    if (!element) return;

    element.textContent = message;

    element.className =
        `message ${type}`;

}


// =====================================================
// LOAD SELLER SETTINGS
// =====================================================

async function loadSellerSettings() {

    try {

        const response = await fetch(
            "/seller-settings",
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load seller settings."
            );

        }


        // =================================================
        // PAYMENT DETAILS
        // =================================================

        const payment =
            data.payment;

        if (payment) {

            document.getElementById(
                "countryCode"
            ).value =
                payment.country_code || "";

            document.getElementById(
                "paymentMethod"
            ).value =
                payment.payment_method ||
                "Bank Transfer";

            document.getElementById(
                "accountHolderName"
            ).value =
                payment.account_holder_name || "";

            document.getElementById(
                "bankName"
            ).value =
                payment.bank_name || "";

            document.getElementById(
                "accountNumber"
            ).value =
                payment.account_number || "";

            document.getElementById(
                "branchName"
            ).value =
                payment.branch_name || "";

            document.getElementById(
                "routingNumber"
            ).value =
                payment.routing_number || "";

            document.getElementById(
                "sortCode"
            ).value =
                payment.sort_code || "";

            document.getElementById(
                "iban"
            ).value =
                payment.iban || "";

            document.getElementById(
                "swiftBic"
            ).value =
                payment.swift_bic || "";


            // =============================================
            // CURRENCIES
            // =============================================

            let currencies =
                payment.accepted_currencies;

            if (typeof currencies === "string") {

                currencies =
                    currencies
                        .split(",")
                        .map(c => c.trim().toUpperCase());

            }

            if (Array.isArray(currencies)) {

                document
                    .querySelectorAll(".currency")
                    .forEach(checkbox => {

                        checkbox.checked =
                            currencies.includes(
                                checkbox.value
                            );

                    });

            }

        }


        // =================================================
        // DELIVERY DETAILS
        // =================================================

        const delivery =
            data.delivery;

        if (delivery) {

            document.getElementById(
                "deliveryAvailable"
            ).checked =
                Number(
                    delivery.delivery_available
                ) === 1;

            document.getElementById(
                "deliveryFee"
            ).value =
                delivery.delivery_fee || 0;

            document.getElementById(
                "deliveryAreas"
            ).value =
                delivery.delivery_areas || "";

            document.getElementById(
                "estimatedDeliveryTime"
            ).value =
                delivery.estimated_delivery_time || "";

            document.getElementById(
                "pickupAvailable"
            ).checked =
                Number(
                    delivery.pickup_available
                ) === 1;

            document.getElementById(
                "pickupLocation"
            ).value =
                delivery.pickup_location || "";

        }


        console.log(
            "Seller settings loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "LOAD SELLER SETTINGS ERROR:",
            error
        );

        showMessage(
            paymentMessage,
            error.message,
            "error"
        );

    }

}


// =====================================================
// SAVE PAYMENT DETAILS
// =====================================================

if (paymentForm) {

    paymentForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            showMessage(
                paymentMessage,
                "Saving payment details...",
                "success"
            );


            const currencies =
                Array.from(
                    document.querySelectorAll(
                        ".currency:checked"
                    )
                ).map(
                    checkbox =>
                        checkbox.value
                );


            const paymentData = {

                country_code:
                    document.getElementById(
                        "countryCode"
                    ).value.trim(),

                payment_method:
                    document.getElementById(
                        "paymentMethod"
                    ).value,

                account_holder_name:
                    document.getElementById(
                        "accountHolderName"
                    ).value.trim(),

                bank_name:
                    document.getElementById(
                        "bankName"
                    ).value.trim(),

                account_number:
                    document.getElementById(
                        "accountNumber"
                    ).value.trim(),

                branch_name:
                    document.getElementById(
                        "branchName"
                    ).value.trim(),

                routing_number:
                    document.getElementById(
                        "routingNumber"
                    ).value.trim(),

                sort_code:
                    document.getElementById(
                        "sortCode"
                    ).value.trim(),

                iban:
                    document.getElementById(
                        "iban"
                    ).value.trim(),

                swift_bic:
                    document.getElementById(
                        "swiftBic"
                    ).value.trim(),

                accepted_currencies:
                    currencies

            };


            try {

                const response =
                    await fetch(
                        "/seller-settings/payment",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify(
                                    paymentData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to save payment details."
                    );

                }


                showMessage(
                    paymentMessage,
                    "✓ Payment details saved successfully.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "SAVE PAYMENT ERROR:",
                    error
                );

                showMessage(
                    paymentMessage,
                    error.message,
                    "error"
                );

            }

        }
    );

}


// =====================================================
// SAVE DELIVERY SETTINGS
// =====================================================

if (deliveryForm) {

    deliveryForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            showMessage(
                deliveryMessage,
                "Saving delivery settings...",
                "success"
            );


            const deliveryData = {

                delivery_available:
                    document.getElementById(
                        "deliveryAvailable"
                    ).checked,

                delivery_fee:
                    Number(
                        document.getElementById(
                            "deliveryFee"
                        ).value || 0
                    ),

                delivery_areas:
                    document.getElementById(
                        "deliveryAreas"
                    ).value.trim(),

                estimated_delivery_time:
                    document.getElementById(
                        "estimatedDeliveryTime"
                    ).value.trim(),

                pickup_available:
                    document.getElementById(
                        "pickupAvailable"
                    ).checked,

                pickup_location:
                    document.getElementById(
                        "pickupLocation"
                    ).value.trim()

            };


            try {

                const response =
                    await fetch(
                        "/seller-settings/delivery",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify(
                                    deliveryData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to save delivery settings."
                    );

                }


                showMessage(
                    deliveryMessage,
                    "✓ Delivery settings saved successfully.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "SAVE DELIVERY ERROR:",
                    error
                );

                showMessage(
                    deliveryMessage,
                    error.message,
                    "error"
                );

            }

        }
    );

}


// =====================================================
// LOAD SETTINGS WHEN PAGE OPENS
// =====================================================

loadSellerSettings();