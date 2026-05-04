document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    if (!userId || isNaN(userId)) {
        document.getElementById("output2").innerHTML = `<p class="error-text">No User ID provided. Please <a href="/">log in</a>.</p>`;
        return;
    }

    getrequest(userId);
    initCalendar();
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
// Calendar Logic
let currentViewDate = new Date();
let selectedDate = new Date();
let attendanceLogsCache = [];
let fetchLogsTimeout = null;
let isFetchingLogs = false;

function initCalendar() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');

    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        renderCalendar();
        debouncedFetchLogs();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        renderCalendar();
        debouncedFetchLogs();
    });

    if (prevDayBtn) prevDayBtn.addEventListener('click', () => {
        const oldMonth = selectedDate.getMonth();
        const oldYear = selectedDate.getFullYear();
        
        selectedDate.setDate(selectedDate.getDate() - 1);
        
        const newMonth = selectedDate.getMonth();
        const newYear = selectedDate.getFullYear();

        if (oldMonth !== newMonth || oldYear !== newYear) {
            currentViewDate = new Date(newYear, newMonth, 1);
            renderCalendar();
            debouncedFetchLogs();
        } else {
            renderDayAttendance();
        }
    });

    if (nextDayBtn) nextDayBtn.addEventListener('click', () => {
        const oldMonth = selectedDate.getMonth();
        const oldYear = selectedDate.getFullYear();
        
        selectedDate.setDate(selectedDate.getDate() + 1);
        
        const newMonth = selectedDate.getMonth();
        const newYear = selectedDate.getFullYear();

        if (oldMonth !== newMonth || oldYear !== newYear) {
            currentViewDate = new Date(newYear, newMonth, 1);
            renderCalendar();
            debouncedFetchLogs();
        } else {
            renderDayAttendance();
        }
    });

    renderCalendar();
    debouncedFetchLogs(); // Initial fetch
    renderDayAttendance();
}

function debouncedFetchLogs() {
    if (fetchLogsTimeout) clearTimeout(fetchLogsTimeout);
    
    fetchLogsTimeout = setTimeout(() => {
        fetchMonthlyLogs();
    }, 400); // 400ms debounce
}

async function fetchMonthlyLogs() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    if (!userId) return;

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1; // Backend expects 1-12

    isFetchingLogs = true;
    renderDayAttendance(); // Show loading state immediately

    try {
        const res = await fetch(`/${userId}/attendance/logs?year=${year}&month=${month}`);
        if (!res.ok) throw new Error("Failed to fetch logs");
        
        attendanceLogsCache = await res.json();
        console.log(`Fetched ${attendanceLogsCache.length} logs for ${year}-${month}`);
    } catch (err) {
        console.error("Error fetching logs:", err);
    } finally {
        isFetchingLogs = false;
        renderCalendar(); // Update calendar colors
        renderDayAttendance(); // Update day slots
    }
}

function renderDayAttendance() {
    const dateDisplay = document.getElementById('selectedDateDisplay');
    const slotsWrapper = document.getElementById('daySlotsWrapper');
    
    if (!dateDisplay || !slotsWrapper) return;

    // Format date display
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = selectedDate.toLocaleDateString(undefined, options);

    slotsWrapper.innerHTML = '';

    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySubjects = periodsData[dayName] || [];

    if (daySubjects.length === 0) {
        slotsWrapper.innerHTML = '<p style="color: #64748b; font-style: italic; padding: 20px;">No subjects scheduled for this day.</p>';
        return;
    }

    const formatDate = (date) => {
        // If it's already a string in YYYY-MM-DD format, return it
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
            return date.substring(0, 10);
        }
        const d = new Date(date);
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();
        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    };

    const selectedDateStr = formatDate(selectedDate);
    
    // Render regular subjects from timetable
    daySubjects.forEach((subject, index) => {
        if (!subject.name) return;

        const slot = document.createElement('div');
        slot.className = 'attendance-slot';
        
        // Find if there's a log for this specific timetable slot and date
        const log = attendanceLogsCache.find(l => {
            const logDateStr = formatDate(l.date);
            const match = logDateStr === selectedDateStr && Number(l.timetable_id) === Number(subject.timetableId);
            return match;
        });

        let status = log ? log.status : 'pending';
        if (isFetchingLogs) status = 'loading';

        slot.innerHTML = `
            <div class="slot-content">
                <span class="slot-subject-name">${subject.name}</span>
                <div class="slot-status-badge status-${status}">${status}</div>
            </div>
            <div class="slot-actions-overlay">
                <button class="overlay-btn btn-present-mini" onclick="markAttendance('${subject.name}', 'present', event, ${subject.timetableId}, ${subject.id})">Present</button>
                <button class="overlay-btn btn-absent-mini" onclick="markAttendance('${subject.name}', 'absent', event, ${subject.timetableId}, ${subject.id})">Absent</button>
                <button class="overlay-btn btn-cancelled-mini" onclick="markAttendance('${subject.name}', 'cancelled', event, ${subject.timetableId}, ${subject.id})">Cancelled</button>
                <button class="overlay-btn btn-clear-mini" onclick="markAttendance('${subject.name}', 'clear', event, ${subject.timetableId}, ${subject.id})">Clear</button>
            </div>
        `;
        slot.addEventListener('click', (e) => {
            const isShowing = slot.classList.contains('show-actions');
            document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
            if (!isShowing) {
                slot.classList.add('show-actions');
            }
        });

        slotsWrapper.appendChild(slot);
    });

    // Render extra classes (logs with no timetableId)
    const extraLogs = attendanceLogsCache.filter(l => {
        const logDateStr = formatDate(l.date);
        return logDateStr === selectedDateStr && !l.timetable_id;
    });

    if (extraLogs.length > 0) {
        const extraHeader = document.createElement('h4');
        extraHeader.textContent = "Extra Classes";
        extraHeader.style.marginTop = "20px";
        extraHeader.style.marginBottom = "10px";
        slotsWrapper.appendChild(extraHeader);

        extraLogs.forEach(log => {
            const slot = document.createElement('div');
            slot.className = 'attendance-slot extra-slot';
            
            slot.innerHTML = `
                <div class="slot-content">
                    <div style="display:flex; flex-direction:column;">
                        <span class="slot-subject-name">${log.subject_name}</span>
                        <small style="color: #64748b; font-size: 0.7rem;">Extra Class</small>
                    </div>
                    <div class="slot-status-badge status-${log.status}">${log.status}</div>
                </div>
                <div class="slot-actions-overlay">
                    <button class="overlay-btn btn-present-mini" onclick="markAttendance('${log.subject_name}', 'present', event, null, ${log.subject_id})">Present</button>
                    <button class="overlay-btn btn-absent-mini" onclick="markAttendance('${log.subject_name}', 'absent', event, null, ${log.subject_id})">Absent</button>
                    <button class="overlay-btn btn-cancelled-mini" onclick="markAttendance('${log.subject_name}', 'cancelled', event, null, ${log.subject_id})">Cancelled</button>
                    <button class="overlay-btn btn-clear-mini" onclick="markAttendance('${log.subject_name}', 'clear', event, null, ${log.subject_id})">Remove</button>
                </div>
            `;
            slot.addEventListener('click', (e) => {
                const isShowing = slot.classList.contains('show-actions');
                document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
                if (!isShowing) {
                    slot.classList.add('show-actions');
                }
            });
            slotsWrapper.appendChild(slot);
        });
    }
}

function markWholeDay(status) {
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySubjects = periodsData[dayName] || [];

    if (daySubjects.length === 0) {
        showToast("No subjects to mark for this day");
        return;
    }

    const getLocalDateStr = (date) => {
        const d = new Date(date);
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    };

    const selectedDateStr = getLocalDateStr(selectedDate);

    daySubjects.forEach(subject => {
        if (!subject.timetableId) return;
        
        const existingLogIndex = attendanceLogsCache.findIndex(l => {
            return getLocalDateStr(l.date) === selectedDateStr && Number(l.timetable_id) === Number(subject.timetableId);
        });

        const finalStatus = (status === 'holiday') ? 'cancelled' : status;

        if (existingLogIndex !== -1) {
            attendanceLogsCache[existingLogIndex].status = finalStatus;
            attendanceLogsCache[existingLogIndex].subject_id = subject.id; // Ensure subject_id is set
        } else {
            attendanceLogsCache.push({
                timetable_id: subject.timetableId,
                subject_id: subject.id,
                subject_name: subject.name,
                status: finalStatus,
                date: selectedDateStr
            });
        }
    });

    renderDayAttendance();
    showToast(`Marked whole day as ${status.charAt(0).toUpperCase() + status.slice(1)}`);
}

async function markAttendance(subjectName, status, event, timetableId, subjectId) {
    if (event) event.stopPropagation(); // Prevent toggling the overlay again
    
    // Find the slot element
    const slot = event ? event.target.closest('.attendance-slot') : null;
    const badge = slot ? slot.querySelector('.slot-status-badge') : null;

    // Optimistic UI Update (if it's not a 'clear' action for an extra class)
    if (!(status === 'clear' && !timetableId)) {
        if (badge) {
            badge.className = `slot-status-badge status-${status}`;
            badge.textContent = status;
        }
    }

    const getLocalDateStr = (date) => {
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
            return date.substring(0, 10);
        }
        const d = new Date(date);
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    };

    // Update Local Cache
    const selectedDateStr = getLocalDateStr(selectedDate);
    
    // Find existing log
    const existingLogIndex = attendanceLogsCache.findIndex(l => {
        if (timetableId) {
            return getLocalDateStr(l.date) === selectedDateStr && Number(l.timetable_id) === Number(timetableId);
        } else {
            return getLocalDateStr(l.date) === selectedDateStr && Number(l.subject_id) === Number(subjectId) && !l.timetable_id;
        }
    });

    if (status === 'clear') {
        if (existingLogIndex !== -1) {
            attendanceLogsCache.splice(existingLogIndex, 1);
        }
        if (badge) {
            badge.className = `slot-status-badge status-pending`;
            badge.textContent = 'pending';
        }
        if (!timetableId) {
            // If it's an extra class being removed, re-render
            renderDayAttendance();
        }
    } else {
        if (existingLogIndex !== -1) {
            attendanceLogsCache[existingLogIndex].status = status;
            attendanceLogsCache[existingLogIndex].subject_id = subjectId;
        } else {
            // Add new temporary log to cache
            attendanceLogsCache.push({
                timetable_id: timetableId ? Number(timetableId) : null,
                subject_id: Number(subjectId),
                subject_name: subjectName,
                status: status,
                date: selectedDateStr
            });
        }
    }

    // Close overlay if still present
    if (slot) slot.classList.remove('show-actions');
    
    // Show toast for feedback
    showToast(`${subjectName}: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
}

function showAddExtraClassModal() {
    if (!window.cachedSubjects || window.cachedSubjects.length === 0) {
        customAlert("No subjects found. Please add subjects first in 'Edit Subjects' section.", "No Subjects", "⚠️");
        return;
    }

    const modalHtml = `
        <div style="text-align: left; margin-bottom: 20px;">
            <label style="display:block; margin-bottom: 8px; font-weight: bold;">Select Subject</label>
            <select id="extra-subject-select" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                ${window.cachedSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
        </div>
    `;

    // We can't easily use customAlert for inputs without modification, 
    // so let's use a simple approach for now or modify custom-alert.js if possible.
    // For now, let's use a simple prompt-like modal if we can't use customConfirm.
    
    // Actually, let's just use a prompt for simplicity if I can't easily add HTML to customConfirm.
    // Wait, I can just create a temporary modal here.

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.innerHTML = `
        <div class="custom-modal">
            <span class="modal-icon">➕</span>
            <h3 class="modal-title">Add Extra Class</h3>
            <p class="modal-message">Select a subject to add as an extra class for this day.</p>
            ${modalHtml}
            <div class="modal-buttons">
                <button class="modal-btn" style="background: #f0f0f0; color: #333;" id="cancel-extra-btn">Cancel</button>
                <button class="modal-btn" style="background: #8b5cf6; color: white;" id="confirm-extra-btn">Add Class</button>
            </div>
        </div>
    `;
    document.body.appendChild(backdrop);

    document.getElementById('cancel-extra-btn').onclick = () => {
        document.body.removeChild(backdrop);
    };

    document.getElementById('confirm-extra-btn').onclick = () => {
        const select = document.getElementById('extra-subject-select');
        const subjectId = select.value;
        const subjectName = select.options[select.selectedIndex].text;
        
        markAttendance(subjectName, 'present', null, null, Number(subjectId));
        document.body.removeChild(backdrop);
        renderDayAttendance();
        
        showToast("Extra class added! Don't forget to click 'Save Attendance'.");
    };
}

async function saveAttendance() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    if (!userId) {
        await customAlert("User ID not found!", "Error", "❌");
        return;
    }

    const saveBtn = document.getElementById('save-attendance-btn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const res = await fetch(`/${userId}/attendance/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: attendanceLogsCache })
        });

        const data = await res.json();

        if (res.ok) {
            await customAlert("Attendance saved successfully!", "Success", "✅");
            // Refresh dashboard data to update percentages
            getrequest(userId);
        } else {
            await customAlert(data.message || "Failed to save attendance", "Error", "❌");
        }
    } catch (err) {
        console.error("Save error:", err);
        await customAlert("Error connecting to server", "Error", "❌");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function renderCalendar() {
    const monthDisplay = document.getElementById('monthDisplay');
    const calendarDays = document.getElementById('calendarDays');
    
    if (!monthDisplay || !calendarDays) return;

    // Clear previous days
    calendarDays.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    // Display Month and Year
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    monthDisplay.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Add empty slots for days of previous month
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDiv);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        if (isCurrentMonth && day === today.getDate()) {
            dayDiv.classList.add('today');
        }

        // Highlight if this is the selected date
        if (selectedDate.getFullYear() === year && 
            selectedDate.getMonth() === month && 
            selectedDate.getDate() === day) {
            dayDiv.classList.add('selected');
        }

        // Apply attendance status color
        const dayDate = new Date(year, month, day);
        const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduledSubjects = periodsData[dayOfWeek] || [];
        
        if (scheduledSubjects.length > 0) {
            const dateStr = [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
            const dayLogs = attendanceLogsCache.filter(l => {
                const lDate = new Date(l.date);
                const lStr = [lDate.getFullYear(), String(lDate.getMonth() + 1).padStart(2, '0'), String(lDate.getDate()).padStart(2, '0')].join('-');
                return lStr === dateStr;
            });

            if (dayLogs.length > 0 && !isFetchingLogs) {
                const statuses = dayLogs.map(l => l.status);
                const hasAbsent = statuses.includes('absent');
                const hasPresent = statuses.includes('present');
                const hasCancelled = statuses.includes('cancelled');
                const allCancelled = statuses.every(s => s === 'cancelled');

                if (allCancelled) {
                    dayDiv.classList.add('cal-cancelled');
                } else if (hasAbsent) {
                    dayDiv.classList.add('cal-absent');
                } else if (hasPresent) {
                    dayDiv.classList.add('cal-present');
                    // Add marker if some classes were cancelled but overall day is green
                    if (hasCancelled) {
                        dayDiv.classList.add('has-cancelled-marker');
                    }
                }
            } else if (isFetchingLogs) {
                dayDiv.classList.add('cal-loading');
            }
        }

        dayDiv.addEventListener('click', () => {
            selectedDate = new Date(year, month, day);
            renderCalendar(); // Re-render to update highlights
            renderDayAttendance();
            console.log(`Selected for slot machine: ${selectedDate.toDateString()}`);
        });

        calendarDays.appendChild(dayDiv);
    }
}
