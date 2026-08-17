document.addEventListener("DOMContentLoaded", () => {

    // Load revenue summary
    fetch("/admin/revenue/summary")
        .then(response => response.json())
        .then(data => {

            const cards = document.querySelectorAll(".card h1");

            cards[0].textContent = "N$ " + (data.totalRevenue || 0);
            cards[1].textContent = "N$ " + (data.totalCommission || 0);
            cards[2].textContent = "N$ " + (data.totalPayouts || 0);
            cards[3].textContent = "N$ " + (data.pendingWithdrawals || 0);

        })
        .catch(err => console.error(err));

    // Load revenue history
    fetch("/admin/revenue/history")
        .then(response => response.json())
        .then(records => {

            const table = document.getElementById("revenueTable");
            table.innerHTML = "";

            if (records.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="7">No revenue records found.</td>
                    </tr>
                `;
                return;
            }

            records.forEach(record => {

                table.innerHTML += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.order_id}</td>
                        <td>${record.customer}</td>
                        <td>N$ ${record.total}</td>
                        <td>N$ ${record.commission}</td>
                        <td>N$ ${record.seller_paid}</td>
                        <td class="status">${record.status}</td>
                    </tr>
                `;

            });

        })
        .catch(err => console.error(err));

});