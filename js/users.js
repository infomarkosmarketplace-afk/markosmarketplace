document.addEventListener("DOMContentLoaded", () => {

    const usersTable = document.getElementById("usersTable");
    const searchInput = document.getElementById("searchUser");

    let users = [];


    // Load users
    function loadUsers(){

        fetch("/admin/users")
        .then(response => response.json())
        .then(data => {

            users = data;
            displayUsers(users);

        })
        .catch(error => {
            console.error("Error loading users:", error);

            usersTable.innerHTML = `
                <tr>
                    <td colspan="6">
                        Failed to load users
                    </td>
                </tr>
            `;
        });

    }


    // Display users
    function displayUsers(data){

        usersTable.innerHTML = "";


        if(data.length === 0){

            usersTable.innerHTML = `
                <tr>
                    <td colspan="6">
                        No users found
                    </td>
                </tr>
            `;

            return;
        }


        data.forEach(user => {

            usersTable.innerHTML += `

            <tr>

                <td>${user.id}</td>

                <td>${user.name}</td>

                <td>${user.email}</td>

                <td>${user.role}</td>

                <td>
                    ${user.status || "Active"}
                </td>

                <td>

                    <button class="edit"
                    onclick="editUser(${user.id})">
                    Edit
                    </button>


                    <button class="delete"
                    onclick="deleteUser(${user.id})">
                    Delete
                    </button>

                </td>

            </tr>

            `;

        });

    }



    // Search users
    searchInput.addEventListener("keyup", () => {

        const value = searchInput.value.toLowerCase();


        const filtered = users.filter(user =>

            user.name.toLowerCase().includes(value) ||
            user.email.toLowerCase().includes(value)

        );


        displayUsers(filtered);

    });



    // Delete user
    window.deleteUser = function(id){

        if(!confirm("Delete this user?")){
            return;
        }


        fetch(`/admin/users/${id}`,{

            method:"DELETE"

        })

        .then(response => response.json())

        .then(data => {

            alert(data.message);

            loadUsers();

        })

        .catch(error => console.error(error));

    };



    // Edit user
    window.editUser = function(id){

        alert("Edit user ID: " + id);

        // Later we can open an edit form/modal here

    };



    loadUsers();

});