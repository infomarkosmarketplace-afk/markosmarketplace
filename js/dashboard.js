// ================================
// Marketplace Dashboard
// ================================

// Backend URL
const API_URL = "http://localhost:3000";

// Get JWT token
const token = localStorage.getItem("token");

// Redirect if not logged in
if (!token) {
    window.location.href = "/";
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    });
}

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        const mode = document.body.classList.contains("dark-mode")
            ? "dark"
            : "light";

        localStorage.setItem("theme", mode);

    });

}

// Restore saved theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
}

// ================================
// LOAD USER PROFILE
// ================================

async function loadProfile() {

    try {

        const response = await fetch(`${API_URL}/auth/profile`, {

            method: "GET",

            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }

        });

        if (!response.ok) {
            throw new Error("Failed to load profile");
        }

        const user = await response.json();

        // Welcome message
        const welcomeUser = document.getElementById("welcomeUser");
        if (welcomeUser) {
            welcomeUser.textContent = `Welcome back, ${user.name}!`;
        }

        // Profile information
        const userName = document.getElementById("userName");
        if (userName) {
            userName.textContent = user.name;
        }

        const userEmail = document.getElementById("userEmail");
        if (userEmail) {
            userEmail.textContent = user.email;
        }

        // Profile picture (optional)
        if (user.photo) {

            const profileImage = document.getElementById("profileImage");

            if (profileImage) {
                profileImage.src = user.photo;
            }

        }

    } catch (error) {

        console.error("Profile Error:", error);

    }

}

// Load profile when page opens
loadProfile();

// ==============================
// PART 3 - Exchange Rates
// ==============================

async function loadExchangeRates() {
    try {
        const response = await fetch("/api/exchange-rates");
        const rates = await response.json();

        const container = document.getElementById("exchangeRates");

        container.innerHTML = "";

        rates.forEach(rate => {
            container.innerHTML += `
                <div class="rate-card">
                    <div class="currency-symbol">${rate.currency_symbol}</div>
                    <div class="currency-name">${rate.currency_name}</div>
                    <div class="currency-code">${rate.currency_code}</div>
                    <div class="currency-rate">${rate.exchange_rate}</div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error loading exchange rates:", error);
    }
}

// ==============================
// Recent Activity
// ==============================

async function loadRecentActivity() {
    try {
        const response = await fetch("/api/recent-activity");
        const activities = await response.json();

        const list = document.getElementById("recentActivity");

        list.innerHTML = "";

        activities.forEach(activity => {
            list.innerHTML += `
                <li>
                    <strong>${activity.title}</strong><br>
                    <small>${activity.date}</small>
                </li>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

// ==============================
// PART 4 - Notifications
// ==============================

async function loadNotifications() {
    try {
        const response = await fetch("/api/notifications");
        const notifications = await response.json();

        const container = document.getElementById("notifications");

        container.innerHTML = "";

        if (notifications.length === 0) {
            container.innerHTML = `
                <p class="empty-message">No new notifications.</p>
            `;
            return;
        }

        notifications.forEach(notification => {
            container.innerHTML += `
                <div class="notification-item">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <small>${notification.created_at}</small>
                </div>
            `;
        });

    } catch (error) {
        console.error("Failed to load notifications:", error);
    }
}

// ==============================
// PART 4 - User Profile
// ==============================

async function loadUserProfile() {
    try {
        const response = await fetch("/api/profile");
        const user = await response.json();

        document.getElementById("profileName").textContent = user.name;
        document.getElementById("profileEmail").textContent = user.email;

        if (document.getElementById("profileImage")) {
            document.getElementById("profileImage").src =
                user.profile_image || "images/default-avatar.png";
        }

    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

// ==============================
// Initialize Part 4 Features
// ==============================

loadNotifications();
loadUserProfile();

// ==============================
// PART 5 - Admin Panel
// ==============================

async function loadAdminPanel() {
    try {
        const response = await fetch("/api/admin/dashboard");
        const data = await response.json();

        // Hide admin section if user is not an admin
        if (!data.isAdmin) {
            const adminSection = document.getElementById("adminPanel");
            if (adminSection) {
                adminSection.style.display = "none";
            }
            return;
        }

        // Display admin statistics
        document.getElementById("totalUsers").textContent = data.totalUsers;
        document.getElementById("totalProducts").textContent = data.totalProducts;
        document.getElementById("totalOrders").textContent = data.totalOrders;
        document.getElementById("totalRevenue").textContent = data.totalRevenue;

    } catch (error) {
        console.error("Error loading admin panel:", error);
    }
}

// ==============================
// Refresh Dashboard Statistics
// ==============================

async function refreshDashboard() {
    loadDashboardStats();
    loadExchangeRates();
    loadRecentActivity();
    loadNotifications();
    loadUserProfile();
    loadAdminPanel();
}

// Automatically refresh every 60 seconds
setInterval(refreshDashboard, 60000);

// ==============================
// Logout
// ==============================

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";
}

const logoutButton = document.getElementById("logoutBtn");

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

// ==============================
// Settings Button
// ==============================

const settingsButton = document.getElementById("settingsBtn");

if (settingsButton) {
    settingsButton.addEventListener("click", () => {
        window.location.href = "/settings.html";
    });
}

// ==============================
// Start Everything
// ==============================

refreshDashboard();

// ==============================
// PART 6 - Final Dashboard Features
// ==============================

// Check if user is logged in
function checkAuthentication() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Your session has expired. Please login again.");
        window.location.href = "/";
    }
}

// ==============================
// Mobile Sidebar
// ==============================

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });
}

// ==============================
// Live Search
// ==============================

const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("keyup", function () {

        const filter = this.value.toLowerCase();

        document.querySelectorAll(".search-item").forEach(item => {

            const text = item.textContent.toLowerCase();

            if (text.includes(filter)) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }

        });

    });
}

// ==============================
// Loading Spinner
// ==============================

function showLoader() {
    const loader = document.getElementById("loader");

    if (loader) {
        loader.style.display = "flex";
    }
}

function hideLoader() {
    const loader = document.getElementById("loader");

    if (loader) {
        loader.style.display = "none";
    }
}

// ==============================
// Global Error Handler
// ==============================

function showError(message) {

    const errorBox = document.getElementById("errorMessage");

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.style.display = "block";

    setTimeout(() => {
        errorBox.style.display = "none";
    }, 4000);
}

// ==============================
// Notification Badge
// ==============================

async function updateNotificationBadge() {

    try {

        const response = await fetch("/api/notifications");

        const notifications = await response.json();

        const badge = document.getElementById("notificationBadge");

        if (!badge) return;

        badge.textContent = notifications.length;

        badge.style.display =
            notifications.length > 0 ? "inline-flex" : "none";

    } catch (error) {

        console.error(error);

    }

}

// ==============================
// Refresh Only Dynamic Sections
// ==============================

async function refreshDynamicData() {

    try {

        showLoader();

        await Promise.all([
            loadDashboardStats(),
            loadExchangeRates(),
            loadRecentActivity(),
            loadNotifications(),
            updateNotificationBadge()
        ]);

    } catch (error) {

        console.error(error);
        showError("Unable to refresh dashboard.");

    } finally {

        hideLoader();

    }

}

// Refresh every 30 seconds
setInterval(refreshDynamicData, 30000);

// ==============================
// Initialize Dashboard
// ==============================

document.addEventListener("DOMContentLoaded", async () => {

    checkAuthentication();

    showLoader();

    try {

        await refreshDashboard();
        await updateNotificationBadge();

    } catch (error) {

        console.error(error);
        showError("Dashboard failed to load.");

    } finally {

        hideLoader();

    }

});