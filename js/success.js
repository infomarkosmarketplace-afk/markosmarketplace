const status = document.getElementById("status");
const message = document.getElementById("message");

const params = new URLSearchParams(window.location.search);
const orderId = params.get("token");

if (orderId) {
    status.textContent = "✅ Payment Successful!";
    message.textContent = `Order ID: ${orderId}`;
} else {
    status.textContent = "❌ Payment Failed";
    message.textContent = "No order information found.";
}