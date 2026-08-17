document.addEventListener("DOMContentLoaded", () => {

    const registerForm =
        document.getElementById("registerForm");


    if (!registerForm) {

        console.error("Register form not found");

        return;

    }


    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const phone_number =
                document
                    .getElementById("phone_number")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value;


            // SELLER ONLY
            const role = "seller";


            // Check required fields
            if (
                !name ||
                !email ||
                !phone_number ||
                !password
            ) {

                alert(
                    "Please fill in all fields."
                );

                return;

            }


            // Password length
            if (password.length < 6) {

                alert(
                    "Password must be at least 6 characters."
                );

                return;

            }


            // Phone number must start with country code
            if (!phone_number.startsWith("+")) {

                alert(
                    "Phone number must start with a country code, for example +264."
                );

                return;

            }


            // Registration data
            const userData = {

                name: name,

                email: email,

                phone_number: phone_number,

                password: password,

                role: role

            };


            console.log(
                "Sending seller registration:",
                userData
            );


            try {

                const response =
                    await fetch(
                        "/auth/register",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    userData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (response.ok) {

                    alert(
                        data.message ||
                        "Seller account created successfully!"
                    );


                    // SAVE THE LOGIN TOKEN
                    // This allows the seller to enter
                    // the dashboard without logging in again.

                    localStorage.setItem(
                        "token",
                        data.token
                    );


                    // GO DIRECTLY TO SELLER DASHBOARD

                    window.location.href =
                        data.redirect ||
                        "seller-dashboard.html";


                    return;

                }


                alert(
                    data.message ||
                    "Registration failed."
                );


                console.error(
                    "Registration failed:",
                    data
                );


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                alert(
                    "Could not connect to the server. Please make sure the server is running."
                );

            }

        }
    );

});