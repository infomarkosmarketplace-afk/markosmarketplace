// ==================================
// Marko's Marketplace
// Account Page JavaScript
// ==================================


// ================================
// Account Data Placeholder
// Backend will replace this
// ================================

let user = {

    name: "User Name",

    email: "",

    phone: "",

    country: "",

    address: "",

    seller: false

};



// ================================
// Account Tabs
// ================================


const tabs =
document.querySelectorAll(".account-tab");


const sections =
document.querySelectorAll(".account-section");



tabs.forEach(tab=>{


    tab.addEventListener(
        "click",
        ()=>{


            tabs.forEach(t=>{

                t.classList.remove(
                    "active"
                );

            });



            sections.forEach(section=>{

                section.classList.remove(
                    "active"
                );

            });



            tab.classList.add(
                "active"
            );



            document
            .getElementById(
                tab.dataset.section
            )
            .classList.add(
                "active"
            );


        }
    );


});





// ================================
// Load User Information
// ================================


function loadUser(){


document.getElementById(
"accountName"
).textContent =
user.name;



document.getElementById(
"fullName"
).value =
user.name;



document.getElementById(
"email"
).value =
user.email;



document.getElementById(
"phone"
).value =
user.phone;



document.getElementById(
"country"
).value =
user.country;



document.getElementById(
"address"
).value =
user.address;



}





// ================================
// Save Profile
// ================================


document.getElementById(
"saveProfileBtn"
).onclick=function(){


user.name =
document.getElementById(
"fullName"
).value;



alert(
"Profile saved"
);


};





// ================================
// Dark Mode
// ================================


const darkMode =
document.getElementById(
"darkMode"
);



if(darkMode){


darkMode.onchange=function(){


document.body.classList.toggle(
"dark-mode"
);


};


}





// ================================
// Save Settings
// ================================


document.getElementById(
"saveSettingsBtn"
).onclick=function(){


alert(
"Settings saved"
);


};





// ================================
// Change Password
// ================================


document.getElementById(
"changePasswordBtn"
).onclick=function(){


let newPassword =
document.getElementById(
"newPassword"
).value;



let confirmPassword =
document.getElementById(
"confirmPassword"
).value;



if(newPassword !== confirmPassword){


alert(
"Passwords do not match"
);


return;


}



alert(
"Password updated"
);


};





// ================================
// Logout
// ================================


document.getElementById(
"logoutBtn"
).onclick=function(){


localStorage.clear();


window.location.href =
"login.html";


};





// ================================
// Start
// ================================

loadUser();