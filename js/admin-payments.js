const token = localStorage.getItem("token");


// =====================================================
// LOAD PENDING PAYMENTS
// =====================================================

async function loadPayments() {

    const box =
        document.getElementById("payments");

    if (!box) {
        return;
    }

    box.innerHTML = `
        <div class="loading">
            Loading payment proofs...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/admin/payments/pending",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to load payments."
            );

        }


        box.innerHTML = "";


        if (
            !data.payments ||
            data.payments.length === 0
        ) {

            box.innerHTML = `
                <div class="empty">
                    No pending payment proofs.
                </div>
            `;

            return;
        }


        data.payments.forEach(payment => {

            const receipt =
                payment.receipt_image || "";


            /*
            =========================================
            RECEIPT IMAGE PATH
            =========================================

            The backend may return a path such as:

            payment-proofs/receipt.jpg

            We will display it through the server.
            */

            let receiptUrl =
                receipt.startsWith("/")
                    ? receipt
                    : "/" + receipt;


            box.innerHTML += `

                <div class="payment">

                    <h3>
                        Order #${payment.order_id}
                    </h3>

                    <p>
                        <strong>Buyer ID:</strong>
                        ${payment.buyer_id}
                    </p>

                    <p>
                        <strong>Amount:</strong>
                        ${payment.currency}
                        ${Number(
                            payment.total_amount || 0
                        ).toFixed(2)}
                    </p>

                    <p>
                        <strong>Payment Status:</strong>
                        ${payment.status}
                    </p>


                    <div class="receipt">

                        <h4>
                            Payment Receipt
                        </h4>

                        ${
                            receipt
                            ?
                            `
                            <img
                                src="${receiptUrl}"
                                alt="Payment receipt"
                                class="receipt-image"
                                onclick="viewReceipt('${receiptUrl}')"
                            >
                            `
                            :
                            `
                            <p>
                                No receipt image available.
                            </p>
                            `
                        }

                    </div>


                    <div class="payment-actions">

                        <button
                            class="approve-button"
                            onclick="approvePayment(${payment.order_id})"
                        >
                            ✓ Approve Payment
                        </button>

                    </div>

                </div>

            `;

        });


    } catch (error) {

        console.error(
            "LOAD PAYMENTS ERROR:",
            error
        );


        box.innerHTML = `

            <div class="error">

                ${error.message}

                <br><br>

                <button onclick="loadPayments()">
                    Try Again
                </button>

            </div>

        `;

    }

}


// =====================================================
// APPROVE PAYMENT
// =====================================================

async function approvePayment(orderId) {

    if (!orderId) {

        alert(
            "Order ID is missing."
        );

        return;
    }


    const confirmed =
        confirm(
            `Approve payment for Order #${orderId}?\n\n` +
            `This will mark the order as Paid, ` +
            `credit the seller's wallet with 70%, ` +
            `and credit MarketHub's wallet with 30%.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/admin/payments/approve/" +
                orderId,
                {

                    method: "PUT",

                    headers: {

                        "Authorization":
                            "Bearer " + token,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Payment approval failed."
            );

        }


        alert(
            data.message ||
            "Payment approved successfully."
        );


        // Refresh pending payments
        await loadPayments();


    } catch (error) {

        console.error(
            "APPROVE PAYMENT ERROR:",
            error
        );


        alert(
            error.message ||
            "Payment approval failed."
        );

    }

}


// =====================================================
// VIEW RECEIPT
// =====================================================

function viewReceipt(url) {

    window.open(
        url,
        "_blank"
    );

}


// =====================================================
// INITIALIZE
// =====================================================

loadPayments();