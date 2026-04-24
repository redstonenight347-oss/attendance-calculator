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
    const userID = document.querySelector("#getuser").value;
    const attendanceOutput = document.querySelector("#attendanceOutput");

    try {
        
        const getUser = await fetch(`http://192.168.31.159:3000/${userID}/attendance`);
        const response = await getUser.json();
        
        if(response.message){
            attendanceOutput.textContent = response.message;
            console.log(response);
            return;
        }

        response.forEach(item => {
            const div = document.createElement("div");

            div.innerHTML = `<strong>${item.subject}</strong>: ${item.percentage}%`
            attendanceOutput.appendChild(div);
        });

        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        const error = await err.json();
        console.log(error.error);
        attendanceOutput.textContent = error;
    }
}