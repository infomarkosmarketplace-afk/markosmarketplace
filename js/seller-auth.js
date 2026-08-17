const token = localStorage.getItem("token");


if(!token){

    window.location.href="login.html";

}


// Decode JWT
const payload = JSON.parse(
    atob(token.split(".")[1])
);


// Check role

if(payload.role !== "seller"){

    alert("Access denied");

    window.location.href = "index.html";
}