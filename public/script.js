async function postrequest() {
    const name = document.querySelector("#name").value;
    const email = document.querySelector("#email").value;
    const output1 = document.querySelector("#output1");

    try {
        const post = await fetch("http://192.168.31.159:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email }),
        });
        const response = await post.json();
        output1.textContent = JSON.stringify(response, null, 2);
        console.log(response);
    }
    catch (err) {
        console.log(err.message);
        output1.textContent = err.message;
    }
}


async function getrequest() {
    const get = document.querySelector("#getuser").value;
    const output2 = document.querySelector("#output2");

    try {
        
        const getUser = await fetch(`http://192.168.31.159:3000/users?name=${get}`);
        const response = await getUser.json();
        output2.textContent = JSON.stringify(response, null, 2);
        console.log(response);
    }
    catch (err) {
        console.log(err.message);
        output2.textContent = err.message;
    }
}