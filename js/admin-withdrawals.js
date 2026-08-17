const adminToken = localStorage.getItem("token");

async function loadWithdrawalRequests() {

    const container =
        document.getElementById("withdrawalRequests");

    try {

        const response = await fetch(
            "/admin/withdrawals/pending",
            {
                headers: {
                    Authorization:
                        "Bearer " + adminToken
                }
            }
        );

        const withdrawals = await response.json();

        if (!response.ok) {
            throw new Error(
                withdrawals.message ||
                "Unable to load withdrawal requests."
            );
        }


        if (withdrawals.length === 0) {

            container.innerHTML =
                "<p>No pending withdrawal requests.</p>";

            return;
        }


        container.innerHTML = "";


        withdrawals.forEach(withdrawal => {

            const card =
                document.createElement("div");

            card.className = "withdrawal-card";

            const account =
                String(withdrawal.account_number);

            const masked =
                account.length > 4
                    ? "****" + account.slice(-4)
                    : account;


            card.innerHTML = `

                <div>

                    <h3>
                        Bank Transfer
                    </h3>

                    <p>
                        <strong>Seller ID:</strong>
                        ${withdrawal.seller_id}
                    </p>

                    <p>
                        <strong>Amount:</strong>
                        ${Number(withdrawal.payout_amount).toFixed(2)}
                        ${withdrawal.payout_currency}
                    </p>

                    <p>
                        <strong>Bank:</strong>
                        ${withdrawal.bank_name || "N/A"}
                    </p>

                    <p>
                        <strong>Account Holder:</strong>
                        ${withdrawal.account_holder_name || "N/A"}
                    </p>

                    <p>
                        <strong>Account:</strong>
                        ${masked}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${withdrawal.status}
                    </p>

                </div>

                <div>

                    <button
                        onclick="approveWithdrawal(${withdrawal.id})">
                        Approve
                    </button>

                    <button
                        onclick="rejectWithdrawal(${withdrawal.id})">
                        Reject
                    </button>

                </div>
            `;


            container.appendChild(card);

        });


    } catch (error) {

        container.innerHTML =
            `<p>${error.message}</p>`;

    }

}


// =====================================================
// APPROVE
// =====================================================

async function approveWithdrawal(id) {

    if (!confirm(
        "Approve this bank transfer?"
    )) {
        return;
    }


    try {

        const response = await fetch(
            `/admin/withdrawals/${id}/approve`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        "Bearer " + adminToken
                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to approve withdrawal."
            );

        }


        alert(
            "Withdrawal approved. It is now ready for bank payout processing."
        );


        loadWithdrawalRequests();


    } catch (error) {

        alert(error.message);

    }

}


// =====================================================
// REJECT
// =====================================================

async function rejectWithdrawal(id) {

    if (!confirm(
        "Reject this withdrawal and return the money to the seller?"
    )) {
        return;
    }


    try {

        const response = await fetch(
            `/admin/withdrawals/${id}/reject`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        "Bearer " + adminToken
                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to reject withdrawal."
            );

        }


        alert(
            "Withdrawal rejected. Funds returned to seller wallet."
        );


        loadWithdrawalRequests();


    } catch (error) {

        alert(error.message);

    }

}


loadWithdrawalRequests();