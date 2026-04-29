async function signinRequest() {
    const email = document.querySelector("#signin-email").value.trim();
    const password = document.querySelector("#signin-password").value.trim();
    const output = document.querySelector("#signin-output");
    const btn = document.getElementById("signin-btn");

    output.textContent = "";

    if (!email || !password) {
        output.innerHTML = `<p class="error-text">Email and password are required.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Signing in...";

    try {
        const post = await fetch("/users/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password }),
        });

        const response = await post.json();
        
        if (!post.ok) {
            output.innerHTML = `<p class="error-text">${response.message}</p>`;
        } else {
            output.innerHTML = `<p>${response.message} (User ID: ${response.userId})</p>`;
        }
        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        output.innerHTML = `<p class="error-text">An error occurred.</p>`;
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function signupRequest() {
    const name = document.querySelector("#signup-name").value.trim();
    const email = document.querySelector("#signup-email").value.trim();
    const password = document.querySelector("#signup-password").value.trim();
    const output = document.querySelector("#signup-output");
    const btn = document.getElementById("signup-btn");

    output.textContent = "";

    if (!name || !email || !password) {
        output.innerHTML = `<p class="error-text">Name, email, and password are required.</p>`;
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        output.innerHTML = `<p class="error-text">Please enter a valid email address.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Signing up...";

    try {
        const post = await fetch("/users/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: password }),
        });

        const response = await post.json();

        if (!post.ok) {
            output.innerHTML = `<p class="error-text">${response.message}</p>`;
        } else {
            output.innerHTML = `<p>${response.message} (User ID: ${response.userId})</p>`;
        }
        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        output.innerHTML = `<p class="error-text">An error occurred.</p>`;
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