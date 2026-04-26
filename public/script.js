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
    const subjects = document.querySelector("#subjects");
    const overall = document.querySelector("#overall");

    subjects.textContent = '';

    try {
        
        const res = await fetch(`/${userID}/attendance`);
        const data = await res.json();

        if(!res.ok){
            subjects.textContent = res.message;
            console.log(res);
            return;
        }

        displaySubjects(data.subjects);
        displayOverall(data.overall);

        console.log(res);
    }
    catch (err) {
        console.log("frontend catch", err)
        subjects.textContent = err.message || "Something went wrong";
    }
}

function displaySubjects(subjects) {
    const container = document.getElementById("subjects");
    container.innerHTML = "";

    subjects.forEach(s => {
        const div = document.createElement("div");
        div.innerHTML = `
            <strong>${s.subject}</strong><br>
            Total: ${s.total_classes} |
            Attended: ${s.attended_classes} |   
            percentage: ${s.percentage}%
            <hr>
        `;
        container.appendChild(div);
    });
}

function displayOverall(overall) {
    const container = document.getElementById("overall");

    container.innerHTML = `
        Total Classes: ${overall.total_classes}<br>
        Attended: ${overall.attended_classes}<br>
        Percentage: ${overall.percentage}%
    `;
}