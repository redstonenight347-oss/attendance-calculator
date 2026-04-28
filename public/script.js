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
        output1.innerHTML = `<p>${error}</p>`;
    }
}


async function getrequest() {
    const userID = document.querySelector("#getuser").value;
    const output2 = document.querySelector("#output2");

    output2.innerHTML = "";


    try {
        
        const res = await fetch(`/${userID}/attendance`);
        const data = await res.json();

        if(!res.ok){
            output2.innerHTML = `<p>${data.message}</p>`;
            console.log(res);
            return;
        }

        displaySubjects(data.subjects);
        displayOverall(data.overall);

        console.log(res);
    }
    catch (err) {
        console.log("frontend catch", err)
        output2.textContent = err.message || "Something went wrong";
    }
}

function displaySubjects(subjects) {
    const output2 = document.getElementById("output2");
    output2.innerHTML = "<h3>Subjects</h3>";

    subjects.forEach(s => {
        const div = document.createElement("div");
        div.innerHTML = `
            <div>
                <strong>${s.subject_name}</strong><br>
                Total: ${s.total_classes} |
                Attended: ${s.attended_classes} |   
                percentage: ${s.attendance_percentage}%
                <hr>
            </div>
        `;
        output2.appendChild(div);
    });
}

function displayOverall(overall) {
    const output2 = document.getElementById("output2");

    const overallDiv = `
        <div>
            <h3>Overall Attendance</h3>
            Total Classes: ${overall.total_classes}<br>
            Attended: ${overall.attended_classes}<br>
            Percentage: ${overall.percentage}%
        </div>
    `;
    output2.innerHTML += overallDiv;
}