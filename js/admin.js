
document.addEventListener("DOMContentLoaded", () => {


    fetch("/admin/dashboard")

    .then(response => response.json())

    .then(data => {


        document.getElementById("totalUsers").textContent =
        data.users || 0;


        document.getElementById("totalProducts").textContent =
        data.products || 0;


        document.getElementById("totalOrders").textContent =
        data.orders || 0;


        document.getElementById("totalRevenue").textContent =
        "N$ " + (data.revenue || 0);



    })


    .catch(error => {

        console.error(
            "Dashboard loading error:",
            error
        );

    });


});

loadAdminStats();

loadRevenue();

loadTables();