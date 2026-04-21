async function postrequest() {
    const name = document.querySelector("#name").value;
    const email = document.querySelector("#email").value;
    const output1 = document.querySelector("#output1");
    
    output1.textContent = "";

    try {
        const post = await fetch("http://192.168.31.159:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email }),
        });

        const response = await post.json();

        output1.textContent = response.message;

        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        const error = await err.json();
        console.log(error.error);
        output1.textContent = error;
    }
}


async function getrequest() {
    const get = document.querySelector("#getuser").value;
    const output2 = document.querySelector("#output2");

    output2.innerHTML = "";

    try {
        
        const getUser = await fetch(`http://192.168.31.159:3000/users?name=${get}`);
        const response = await getUser.json();
        
        if(response.message){
            output2.textContent = response.message;
            console.log(response);
            return;
        }


        output2.innerHTML = `<div>
            ID: ${response.id} <br>
            Name: ${response.name} <br>
            Email: ${response.email} <br>
            Created at: ${response.createdAT}
        </div>`;

        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        const error = await err.json();
        console.log(error.error);
        output1.textContent = error;
    }
}