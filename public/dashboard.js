document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    if (!userId || isNaN(userId)) {
        document.getElementById("output2").innerHTML = `<p class="error-text">No User ID provided. Please <a href="/">log in</a>.</p>`;
        return;
    }

    getrequest(userId);
});

async function getrequest(userID) {
    const output2 = document.querySelector("#output2");
    output2.innerHTML = "Loading attendance...";

    try {
        const res = await fetch(`/${userID}/attendance`);
        const data = await res.json();

        if(!res.ok){
            output2.innerHTML = `<p class="error-text">${data.message}</p>`;
            console.log(res);
            return;
        }

        output2.innerHTML = ""; // clear loading message
        displaySubjects(data.subjects);
        displayOverall(data.overall);
        populateEditSubjects(data.subjects);

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

    if (!subjects || subjects.length === 0) {
        output2.innerHTML += "<p>No attendance details found. Please go to 'Edit Timetable' to create a table and view attendance.</p>";
        return;
    }

    subjects.forEach(s => {
        const div = document.createElement("div");
        div.className = "subject-card";
        let predictorHtml = "";
        
        if (s.status_message) { // to choose class colors based on status message 
            const predictorClass = s.classes_needed > 0 ? "predictor-warning" : "predictor-safe";
            predictorHtml = `<span class="${predictorClass}">Predictor: ${s.status_message}</span>`;
        }

        div.innerHTML = `
            <div class="subject-header">
                <span class="subject-name">${toTitleCase(s.subject_name)}</span>
                <span class="subject-percent ${s.attendance_percentage < 75 ? 'text-danger' : 'text-success'}">${s.attendance_percentage}%</span>
            </div>
            <div class="subject-stats">
                Total Classes: ${s.total_classes} | Attended: ${s.attended_classes}
            </div>
            <div>
                ${predictorHtml}
            </div>
        `;
        output2.appendChild(div);
    });
}

function displayOverall(overall) {
    const output2 = document.getElementById("output2");

    if (!overall) return;

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

function showSection(sectionId, navLink) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));
    navLink.classList.add('active');

    if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

function populateEditSubjects(subjects) {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    if (!subjects || subjects.length === 0) return;
    
    subjects.forEach(s => {
        addSubjectInput(s.subject_name, s.subject_id);
    });
}

function addSubjectInput(value = '', id = '') {
    const list = document.getElementById('subjects-list');
    const index = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'subject-input-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.innerHTML = `
        <label style="min-width: 80px; font-weight: bold;">Subject <span class="subject-number">${index}</span></label>
        <input type="text" class="subject-name-input" placeholder="Subject Name" value="${value}" data-id="${id}">
        <button type="button" class="delete-subject-btn" onclick="this.parentElement.remove(); updateSubjectLabels();">❌</button>
    `;
    list.appendChild(div);
}

function updateSubjectLabels() {
    const list = document.getElementById('subjects-list');
    Array.from(list.children).forEach((row, idx) => {
        const numberSpan = row.querySelector('.subject-number');
        if (numberSpan) {
            numberSpan.textContent = idx + 1;
        }
    });
}

function deleteAllSubjects() {
    if (confirm("Warning: This will clear all subjects from this form. Existing data might be deleted upon saving. Are you sure?")) {
        document.getElementById('subjects-list').innerHTML = '';
    }
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

async function saveSubjects() {
    if (!confirm("Warning: Saving this will overwrite your existing timetable data. Are you sure you want to proceed?")) {
        return;
    }

    const saveBtn = document.querySelector('.floating-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    const inputs = document.querySelectorAll('.subject-name-input');
    const subjects = [];
    inputs.forEach(input => {
        let val = input.value.trim();
        const id = input.getAttribute('data-id');
        if (val) {
            val = toTitleCase(val);
            subjects.push({
                id: id ? parseInt(id) : null,
                name: val
            });
        }
    });

    const output = document.getElementById('timetable-output');
    
    if (subjects.length === 0) {
        output.textContent = "Please add at least one subject.";
        output.className = "error-text";
        return;
    }
    
    output.textContent = "Saving...";
    output.className = "";

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    try {
        const res = await fetch(`/users/${userId}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjects })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            output.textContent = data.message;
            output.style.color = "green";
            getrequest(userId);
            document.getElementById('subjects-list').innerHTML = ''; // clear inputs
        } else {
            output.textContent = data.message || "Failed to save subjects";
            output.className = "error-text";
        }
    } catch (err) {
        output.textContent = "Error saving subjects";
        output.className = "error-text";
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Subjects';
        }
    }
}
