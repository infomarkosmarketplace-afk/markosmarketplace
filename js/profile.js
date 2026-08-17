// ===============================
// API BASE
// ===============================
const API_URL = "http://localhost:3000";

// Get token
const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
}

// ===============================
// ELEMENTS
// ===============================
const profileImage = document.getElementById("profileImage");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const addressInput = document.getElementById("address");

const memberSince = document.getElementById("memberSince");

const saveBtn = document.getElementById("saveProfile");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("profileUpload");

// ===============================
// LOAD PROFILE (GET /profile)
// ===============================
async function loadProfile() {

    try {

        const res = await fetch(`${API_URL}/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const user = await res.json();

        userName.textContent = user.name;
        userEmail.textContent = user.email;

        nameInput.value = user.name;
        emailInput.value = user.email;
        phoneInput.value = user.phone || "";
        addressInput.value = user.address || "";

        memberSince.textContent = new Date(user.created_at).toLocaleDateString();

        if (user.profile_image) {
            profileImage.src = `${API_URL}/uploads/profiles/${user.profile_image}`;
        }

    } catch (err) {
        console.log(err);
        alert("Failed to load profile");
    }
}

loadProfile();

// ===============================
// SAVE PROFILE (PUT /profile)
// ===============================
saveBtn.addEventListener("click", async () => {

    const data = {
        name: nameInput.value,
        phone: phoneInput.value,
        address: addressInput.value
    };

    const res = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message);

    loadProfile();
});

// ===============================
// UPLOAD PROFILE IMAGE (POST /profile/photo)
// ===============================
uploadBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", async () => {

    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_URL}/profile/photo`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const result = await res.json();
    alert(result.message);

    loadProfile();
});

// ===============================
// LOGOUT
// ===============================
document.querySelector(".logout").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
});