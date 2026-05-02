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
        populateTimetableGrid(data.subjects);
        populateTimetable(data.timetable);

        // Populate User Info from combined response
        if (data.user) {
            document.querySelectorAll('.profile-name').forEach(el => el.textContent = data.user.name);
            const profileNameInput = document.getElementById('profile-name-input');
            if (profileNameInput) {
                profileNameInput.value = data.user.name;
                window.cachedProfileName = data.user.name;
            }
            const profileIdDisplay = document.getElementById('profile-id-display');
            if (profileIdDisplay) profileIdDisplay.textContent = data.user.id;
        }

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
        output2.innerHTML += "<p>No attendance details found. Please go to 'Edit Subjects' to create a table and view attendance.</p>";
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
                <span class="subject-name">${s.subject_name}</span>
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
    if (navLink) navLink.classList.add('active');

    // Update mobile header title
    const mobileHeaderTitle = document.querySelector('.mobile-header h2');
    if (mobileHeaderTitle && navLink) {
        mobileHeaderTitle.textContent = navLink.textContent;
    }

    if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

function populateEditSubjects(subjects) {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    window.cachedSubjects = [];
    if (!subjects || subjects.length === 0) return;
    
    subjects.forEach(s => {
        const name = s.subject_name || '';
        addSubjectInput(name, s.subject_id);
        window.cachedSubjects.push({
            id: s.subject_id,
            name: name
        });
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

async function deleteAllSubjects() {
    if (await customConfirm("Warning: This will clear all subjects from this form. Existing data might be deleted upon saving. Are you sure?", "Clear All Subjects", "⚠️")) {
        document.getElementById('subjects-list').innerHTML = '';
    }
}

async function saveSubjects() {
    const inputs = document.querySelectorAll('.subject-name-input');
    const subjects = [];
    inputs.forEach(input => {
        let val = input.value.trim();
        const id = input.getAttribute('data-id');
        if (val) {
            subjects.push({
                id: id ? parseInt(id) : null,
                name: val
            });
        }
    });

    const output = document.getElementById('timetable-output');
    output.textContent = "";
    
    // Validation: Empty check
    if (subjects.length === 0 && (!window.cachedSubjects || window.cachedSubjects.length === 0)) {
        output.textContent = "Please add at least one subject.";
        output.className = "error-text";
        return;
    }

    // Check for changes
    if (JSON.stringify(subjects) === JSON.stringify(window.cachedSubjects || [])) {
        await customAlert("No changes detected in your subjects.", "Info", "ℹ️");
        return;
    }

    // If changes detected, ask for confirmation
    if (!(await customConfirm("Warning: Saving this will overwrite your existing timetable data. Are you sure you want to proceed?", "Save Changes", "⚠️"))) {
        return;
    }

    const saveBtn = document.querySelector('.floating-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
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

let draggedSubjectItem = null;

function populateTimetableGrid(subjects) {
    const container = document.getElementById('timetable-grid-container');
    if (!container) return;
    container.innerHTML = '';

    if (!subjects || subjects.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; color: #7f8c8d;">No subjects added yet. Please add subjects in the Edit Subjects section first.</p>';
        return;
    }

    subjects.forEach(s => {
        const box = document.createElement('div');
        box.className = 'draggable-subject';
        box.draggable = true;
        box.textContent = s.subject_name;
        box.dataset.id = s.subject_id;
        
        box.addEventListener('dragstart', handleDragStart);
        box.addEventListener('dragover', handleDragOver);
        box.addEventListener('dragenter', handleDragEnter);
        box.addEventListener('dragleave', handleDragLeave);
        box.addEventListener('drop', handleDrop);
        box.addEventListener('dragend', handleDragEnd);

        container.appendChild(box);
    });
}

function handleDragStart(e) {
    draggedSubjectItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.textContent);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (draggedSubjectItem !== this) {
        let tempText = this.textContent;
        let tempId = this.dataset.id;
        
        this.textContent = draggedSubjectItem.textContent;
        this.dataset.id = draggedSubjectItem.dataset.id;
        
        draggedSubjectItem.textContent = tempText;
        draggedSubjectItem.dataset.id = tempId;
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.draggable-subject');
    items.forEach(item => item.classList.remove('over'));
}

// Timetable Builder Logic
let currentDay = 'Monday';
let periodsData = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

function switchDay(day) {
    currentDay = day;
    const label = document.getElementById('current-day-label');
    if (label) label.textContent = day;
    
    // Update active button
    document.querySelectorAll('.day-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const dayShort = day.substring(0, 3).toLowerCase();
        
        if (btnText === dayShort) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderPeriods();
}

function addPeriod() {
    periodsData[currentDay].push({ id: null, name: '' });
    renderPeriods();
}

function removePeriod() {
    if (periodsData[currentDay].length > 0) {
        periodsData[currentDay].pop();
        renderPeriods();
    }
}

function renderPeriods() {
    const container = document.getElementById('daily-timetable-container');
    if (!container) return;
    container.innerHTML = '';
    
    periodsData[currentDay].forEach((period, index) => {
        const slot = document.createElement('div');
        slot.className = 'period-slot';
        slot.dataset.index = index;
        
        if (period.name) {
            slot.textContent = period.name;
            slot.dataset.id = period.id;
            slot.style.borderStyle = 'solid';
            slot.style.backgroundColor = '#e8f4f8';
            slot.style.color = '#2c3e50';
        } else {
            slot.textContent = `P${index + 1}`;
        }
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragenter', handleDragEnter);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handlePeriodDrop);
        
        container.appendChild(slot);
    });

    renderTimetableOverview();
}

function handlePeriodDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    this.classList.remove('over');
    
    if (draggedSubjectItem) {
        const index = this.dataset.index;
        periodsData[currentDay][index] = {
            id: draggedSubjectItem.dataset.id,
            name: draggedSubjectItem.textContent
        };
        renderPeriods();
    }
    return false;
}

async function saveTimetable() {
    const saveBtn = document.getElementById('save-timetable-btn');
    if (!saveBtn) return;

    // Get userID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    if (!userId) {
        await customAlert("User ID not found in URL! Please log in again.", "Error", "❌");
        return;
    }

    // Check for changes
    if (JSON.stringify(periodsData) === JSON.stringify(window.cachedTimetable || {})) {
        await customAlert("No changes detected in your timetable.", "Info", "ℹ️");
        return;
    }

    if (!(await customConfirm("Are you sure you want to save the changes to your timetable?", "Save Timetable", "⚠️"))) {
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const response = await fetch(`/${userId}/attendance/timetable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ timetable: periodsData })
        });

        const data = await response.json();

        if (response.ok) {
            await customAlert("Timetable saved successfully!", "Success", "✅");
            window.cachedTimetable = JSON.parse(JSON.stringify(periodsData));
        } else {
            await customAlert("Error saving timetable: " + data.message, "Error", "❌");
        }
    } catch (err) {
        console.error("Save error:", err);
        await customAlert("Failed to save timetable. Please check your connection.", "Error", "❌");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Timetable';
    }
}


function populateTimetable(timetable) {
    if (!timetable) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const backendDay = day.toLowerCase();
        if (timetable[backendDay]) {
            periodsData[day] = timetable[backendDay];
        } else {
            periodsData[day] = [];
        }
    });
    
    // Store initial state for change detection
    window.cachedTimetable = JSON.parse(JSON.stringify(periodsData));
    
    renderPeriods();
}


function renderTimetableOverview() {
    const container = document.getElementById('timetable-overview-content');
    if (!container) return;
    container.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const row = document.createElement('div');
        row.className = 'overview-day-row';
        
        const dayName = document.createElement('div');
        dayName.className = 'overview-day-name';
        dayName.textContent = day;
        
        const periodsDiv = document.createElement('div');
        periodsDiv.className = 'overview-periods';
        
        const dayPeriods = periodsData[day] || [];
        const subjectsInDay = dayPeriods.filter(p => p.name);
        
        if (subjectsInDay.length > 0) {
            subjectsInDay.forEach(p => {
                const item = document.createElement('span');
                item.className = 'overview-period-item';
                item.textContent = p.name;
                periodsDiv.appendChild(item);
            });
        } else {
            const empty = document.createElement('span');
            empty.className = 'overview-empty';
            empty.textContent = 'No subjects assigned';
            periodsDiv.appendChild(empty);
        }
        
        row.appendChild(dayName);
        row.appendChild(periodsDiv);
        container.appendChild(row);
    });
}

async function saveProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const nameInput = document.getElementById('profile-name-input');
    
    if (!nameInput || !userId) {
        await customAlert("User information missing. Please reload.", "Error", "❌");
        return;
    }
    
    const newName = nameInput.value.trim();
    
    if (newName === window.cachedProfileName) {
        await customAlert("No changes detected in your profile name.", "Info", "ℹ️");
        return;
    }

    if (!newName) {
        await customAlert("Name cannot be empty", "Error", "❌");
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const res = await fetch(`/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        const data = await res.json();
        if (res.ok) {
            await customAlert("Profile updated successfully!", "Success", "✅");
            window.cachedProfileName = newName;
            document.querySelectorAll('.profile-name').forEach(el => el.textContent = newName);
        } else {
            await customAlert(data.message || "Failed to update profile", "Error", "❌");
        }
    } catch (err) {
        await customAlert("Error updating profile", "Error", "❌");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function copyUserId() {
    const idText = document.getElementById('profile-id-display').textContent;
    
    // Create temporary textarea to copy from
    const textArea = document.createElement("textarea");
    textArea.value = idText;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast("User ID copied!");
    } catch (err) {
        console.error("Copy failed", err);
    }
    
    document.body.removeChild(textArea);
}

function showToast(message) {
    let toast = document.querySelector('.copy-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'copy-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}




