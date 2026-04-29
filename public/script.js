async function postrequest() {
    const name = document.querySelector("#name").value.trim();
    const email = document.querySelector("#email").value.trim();
    const output1 = document.querySelector("#output1");
    const btn = document.getElementById("signin-btn");

    output1.textContent = "";

    if (!name || !email) {
        output1.innerHTML = `<p class="error-text">Name and email are required.</p>`;
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        output1.innerHTML = `<p class="error-text">Please enter a valid email address.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Submitting...";

    try {
        const post = await fetch("/users", {
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
        // const error = await err.json();
        // console.log(error.error);
        output1.innerHTML = `<p class="error-text">An error occurred.</p>`;
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}


async function getrequest() {
    const userID = document.querySelector("#getuser").value.trim();
    const output2 = document.querySelector("#output2");
    const btn = document.getElementById("check-btn");

    output2.innerHTML = "";

    if (!userID || isNaN(userID)) {
        output2.innerHTML = `<p class="error-text">Please enter a valid numeric User ID.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Loading...";

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
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function displaySubjects(subjects) {
    const output2 = document.getElementById("output2");
    output2.innerHTML = "<h3>Subjects</h3>";

    subjects.forEach(s => {
        const div = document.createElement("div");
        div.className = "subject-card";
        let predictorHtml = "";
        
        if (s.status_message) { // to choose class colors based on status message 
            const predictorClass = s.classes_needed > 0 ? "predictor-warning" : "predictor-safe";
            predictorHtml = `<span class="${predictorClass}">Predictor: ${s.status_message}</span>`;
        }

        div.innerHTML = `
            <strong>${s.subject_name}</strong><br>
            Total: ${s.total_classes} |
            Attended: ${s.attended_classes} |   
            Percentage: ${s.attendance_percentage}%
            ${predictorHtml}
        `;
        output2.appendChild(div);
    });
}

function displayOverall(overall) {
    const output2 = document.getElementById("output2");

    const overallDiv = `
        <div class="overall-card">
            <h3>Overall Attendance</h3>
            Total Classes: ${overall.total_classes}<br>
            Attended: ${overall.attended_classes}<br>
            Percentage: ${overall.percentage}%
        </div>
    `;
    output2.innerHTML += overallDiv;
}