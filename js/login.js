document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }


    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");


        if (!emailInput || !passwordInput) {

            console.error(
                "Email or password field not found."
            );

            return;

        }


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value.trim();


        if (!email || !password) {

            alert(
                "Please enter your email and password."
            );

            return;

        }


        // Prevent double-clicking login
        const submitButton =
            loginForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Signing in...";

        }


        try {

            console.log(
                "Sending login request..."
            );


            const response =
                await fetch("/auth/login", {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        email: email,

                        password: password

                    })

                });


            const data =
                await response.json();


            console.log(
                "Login response:",
                data
            );


            if (!response.ok || !data.success) {

                alert(
                    data.message ||
                    "Login failed."
                );

                return;

            }


            // =================================================
            // SAVE JWT
            // =================================================

            if (!data.token) {

                console.error(
                    "Server did not return a JWT token."
                );

                alert(
                    "Login succeeded, but no authentication token was received."
                );

                return;

            }


            localStorage.setItem(
                "token",
                data.token
            );


            // =================================================
            // SAVE USER
            // =================================================

            if (data.user) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

            }


            // =================================================
            // DETERMINE ROLE
            // =================================================

            const role =
                data.user &&
                data.user.role
                    ? data.user.role
                    : "";


            const isAdmin =
                role === "admin" ||
                Number(
                    data.user?.is_admin
                ) === 1;


            console.log(
                "Authenticated role:",
                role
            );


            console.log(
                "Administrator:",
                isAdmin
            );


            // =================================================
            // ADMIN
            // =================================================

            if (isAdmin) {

                console.log(
                    "Redirecting administrator to admin dashboard..."
                );


                window.location.href =
                    "/admin.html";

                return;

            }


            // =================================================
            // SELLER
            // =================================================

            if (role === "seller") {

                console.log(
                    "Redirecting seller..."
                );


                window.location.href =
                    "/seller-dashboard.html";

                return;

            }


            // =================================================
            // BUYER
            // =================================================

            console.log(
                "Redirecting buyer..."
            );


            window.location.href =
                "/index.html";


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            alert(
                "Unable to connect to the server."
            );


        } finally {

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Login";

            }

        }

    });

});