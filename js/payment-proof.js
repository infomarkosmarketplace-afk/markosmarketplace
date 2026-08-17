const form =
document.getElementById("proofForm");

/* =====================================================
FORM SUBMISSION
===================================================== */

if(form){

form.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const message =
            document.getElementById(
                "message"
            );


        const button =
            document.getElementById(
                "submitButton"
            );


        const fileInput =
            document.getElementById(
                "receipt"
            );


        const file =
            fileInput &&
            fileInput.files
                ? fileInput.files[0]
                : null;


        const orderId =
            localStorage.getItem(
                "order_id"
            );


        const token =
            localStorage.getItem(
                "token"
            );


        /* =============================================
           VALIDATE LOGIN
        ============================================= */

        if(!token){

            showMessage(
                "Please log in before submitting payment proof.",
                "error"
            );

            return;

        }


        /* =============================================
           VALIDATE ORDER
        ============================================= */

        if(!orderId){

            showMessage(
                "Order information is missing. Please return to checkout.",
                "error"
            );

            return;

        }


        /* =============================================
           VALIDATE FILE
        ============================================= */

        if(!file){

            showMessage(
                "Please select your payment receipt.",
                "error"
            );

            return;

        }


        /* =============================================
           ALLOWED FILE TYPES
        ============================================= */

        const allowedTypes = [

            "image/jpeg",
            "image/png",
            "image/jpg",
            "application/pdf"

        ];


        if(
            file.type &&
            !allowedTypes.includes(
                file.type
            )
        ){

            showMessage(
                "Please upload a JPG, PNG, JPEG, or PDF receipt.",
                "error"
            );

            return;

        }


        /* =============================================
           FILE SIZE

           Maximum: 10 MB
        ============================================= */

        const maxSize =
            10 * 1024 * 1024;


        if(file.size > maxSize){

            showMessage(
                "Your receipt is too large. Maximum size is 10 MB.",
                "error"
            );

            return;

        }


        /* =============================================
           DISABLE BUTTON
        ============================================= */

        if(button){

            button.disabled =
                true;

            button.innerText =
                "Uploading Payment Proof...";

        }


        showMessage(
            "Uploading your payment proof...",
            "loading"
        );


        try {


            /* =========================================
               FORM DATA
            ========================================= */

            const formData =
                new FormData();


            formData.append(
                "receipt",
                file
            );


            formData.append(
                "order_id",
                orderId
            );


            /*
            =================================================
            IMPORTANT

            The backend should use the authenticated
            buyer from the JWT.

            We do NOT trust a buyer_id supplied by the
            browser.
            =================================================
            */


            /* =========================================
               SEND TO SERVER
            ========================================= */

            const response =
                await fetch(
                    "/payments/upload-proof",
                    {

                        method:
                            "POST",

                        headers: {

                            "Authorization":
                                "Bearer " + token

                        },

                        body:
                            formData

                    }
                );


            /* =========================================
               HANDLE SERVER RESPONSE
            ========================================= */

            let data;


            try {

                data =
                    await response.json();

            }

            catch(jsonError){

                throw new Error(
                    "The server returned an invalid response."
                );

            }


            if(
                !response.ok ||
                !data.success
            ){

                throw new Error(
                    data.message ||
                    "Payment proof upload failed."
                );

            }


            /* =========================================
               SUCCESS
            ========================================= */

            showMessage(
                "Payment proof submitted successfully. Your payment is now waiting for verification.",
                "success"
            );


            /*
            Disable the form after successful
            submission so the buyer doesn't
            accidentally upload the same receipt
            multiple times.
            */

            if(fileInput){

                fileInput.disabled =
                    true;

            }


            if(button){

                button.disabled =
                    true;

                button.innerText =
                    "✓ Payment Proof Submitted";

            }


        }

        catch(error){

            console.error(
                "PAYMENT PROOF ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to upload payment proof.",
                "error"
            );


            if(button){

                button.disabled =
                    false;

                button.innerText =
                    "📤 Submit Payment Proof";

            }

        }

    }
);

}

/* =====================================================
MESSAGE HELPER
===================================================== */

function showMessage(
text,
type
){

const message =
    document.getElementById(
        "message"
    );


if(!message){

    return;

}


message.innerText =
    text;


message.style.display =
    "block";


/*
We intentionally avoid hard-coding
dangerous HTML into the message.
*/

if(type === "success"){

    message.style.background =
        "#eaf8ef";

    message.style.color =
        "#217a43";

    message.style.border =
        "1px solid #b9e4c7";

}

else if(type === "error"){

    message.style.background =
        "#fff0f0";

    message.style.color =
        "#9b3030";

    message.style.border =
        "1px solid #efc2c2";

}

else{

    message.style.background =
        "#f2f5f8";

    message.style.color =
        "#5e6978";

    message.style.border =
        "1px solid #dce2e8";

}

}