document.addEventListener("DOMContentLoaded", () => {

    const topProducts = document.getElementById("topProducts");
    const topSellers = document.getElementById("topSellers");


    // Load analytics summary
    fetch("/admin/analytics/summary")
    .then(response => response.json())
    .then(data => {

        const cards = document.querySelectorAll(".card h1");

        cards[0].textContent = "N$ " + (data.todaySales || 0);
        cards[1].textContent = "N$ " + (data.monthSales || 0);
        cards[2].textContent = data.totalOrders || 0;
        cards[3].textContent = data.newUsers || 0;

    })
    .catch(error => {
        console.error("Analytics summary error:", error);
    });



    // Load top selling products
    fetch("/admin/analytics/top-products")
    .then(response => response.json())
    .then(products => {

        topProducts.innerHTML = "";


        if(products.length === 0){

            topProducts.innerHTML = `
            <tr>
                <td colspan="3">
                    No product data available
                </td>
            </tr>
            `;

            return;
        }


        products.forEach(product => {

            topProducts.innerHTML += `

            <tr>
                <td>${product.product_name}</td>
                <td>${product.sales}</td>
                <td>N$ ${product.revenue}</td>
            </tr>

            `;

        });

    })
    .catch(error => console.error(error));




    // Load top sellers
    fetch("/admin/analytics/top-sellers")
    .then(response => response.json())
    .then(sellers => {

        topSellers.innerHTML = "";


        if(sellers.length === 0){

            topSellers.innerHTML = `
            <tr>
                <td colspan="3">
                    No seller data available
                </td>
            </tr>
            `;

            return;
        }



        sellers.forEach(seller => {

            topSellers.innerHTML += `

            <tr>
                <td>${seller.seller_name}</td>
                <td>${seller.products_sold}</td>
                <td>N$ ${seller.revenue}</td>
            </tr>

            `;

        });

    })
    .catch(error => console.error(error));

});