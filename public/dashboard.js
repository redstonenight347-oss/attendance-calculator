import { fetchDashboardData } from './modules/api.js';
import { getUserIdFromUrl } from './modules/utils.js';
import { Storage } from './modules/storage.js';
import { isSyncing } from './modules/sync.js';
import { 
    populateEditSubjects, 
    addSubjectInput, 
    deleteAllSubjects 
} from './modules/subjects.js';
import { 
    initTimetable, 
    populateTimetableGrid, 
    switchDay, 
    addPeriod, 
    removePeriod 
} from './modules/timetable.js';
import { 
    initCalendar, 
    markAttendance,
    markWholeDay,
    openExtraClassModal,
    closeExtraClassModal,
    saveExtraClass
} from './modules/calendar.js';
import { saveProfile, copyUserId } from './modules/profile.js';

// Expose functions to global scope immediately for HTML onclicks
window.showSection = (sectionId, navLink) => {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));
    if (navLink) navLink.classList.add('active');

    const mobileHeaderTitle = document.querySelector('.mobile-header h2');
    if (mobileHeaderTitle && navLink) {
        mobileHeaderTitle.textContent = navLink.textContent;
    }

    if (window.innerWidth <= 768 && typeof window.closeSidebar === 'function') {
        window.closeSidebar();
    }
};

window.addSubjectInput = addSubjectInput;
window.deleteAllSubjects = deleteAllSubjects;
window.switchDay = switchDay;
window.addPeriod = addPeriod;
window.removePeriod = removePeriod;
window.saveProfile = saveProfile;
window.copyUserId = copyUserId;
window.markAttendance = markAttendance;
window.markWholeDay = markWholeDay;
window.showAddExtraClassModal = openExtraClassModal;
window.closeExtraClassModal = closeExtraClassModal;
window.saveExtraClass = saveExtraClass;

async function initialize(userId) {
    // Initialize global refresh function
    window.refreshDashboard = (data = null, skipSections = []) => {
        if (data) {
            renderDashboardUI(data, skipSections);
            return;
        }
        loadDashboardData(userId, false);
    };
    
    // Initial load: Try cache first for instant UI
    const cachedData = Storage.get(userId, 'dashboard');
    if (cachedData) {
        renderDashboardUI(cachedData);
        initCalendar(); 
    }

    // Always fetch fresh data in background
    loadDashboardData(userId, !cachedData);
}

document.addEventListener("DOMContentLoaded", () => {
    const userId = getUserIdFromUrl();

    if (!userId || isNaN(userId)) {
        const output = document.getElementById("output2");
        if (output) {
            output.innerHTML = `<p class="error-text">No User ID provided. Please <a href="/">log in</a>.</p>`;
        }
        return;
    }

    initialize(userId);
});

async function loadDashboardData(userId, showLoading = false) {
    const output2 = document.querySelector("#output2");
    if (showLoading && output2) output2.innerHTML = "Loading attendance...";

    try {
        const data = await fetchDashboardData(userId);
        
        // If we are currently syncing local changes, don't overwrite the cache or UI
        if (isSyncing()) {
            console.log("Sync in progress, skipping background data update.");
            return;
        }

        Storage.save(userId, 'dashboard', data);
        
        // Initialize Delta-Check markers
        const subjectsForStorage = data.subjects.map(s => ({ id: s.subject_id, name: s.subject_name }));
        Storage.save(userId, 'subjects_last_saved', subjectsForStorage);
        Storage.save(userId, 'timetable_last_saved', data.timetable);

        if (output2 && showLoading) output2.innerHTML = ""; 
        renderDashboardUI(data);

        if (showLoading) initCalendar();
    } catch (err) {
        console.error("Dashboard load error:", err);
        if (showLoading && output2) output2.textContent = err.message || "Something went wrong";
    }
}

function renderDashboardUI(data, skipSections = []) {
    // Always update the main dashboard view
    displaySubjects(data.subjects);
    displayOverall(data.overall);
    
    // Only update edit forms if not explicitly skipped (to avoid focus loss)
    if (!skipSections.includes('subjects')) {
        populateEditSubjects(data.subjects);
    }
    
    if (!skipSections.includes('timetable')) {
        populateTimetableGrid(data.subjects);
        initTimetable(data.timetable);
    }

    // Update User Info
    if (data.user) {
        document.querySelectorAll('.profile-name').forEach(el => el.textContent = data.user.name);
        const profileNameInput = document.getElementById('profile-name-input');
        if (profileNameInput && !skipSections.includes('profile')) {
            profileNameInput.value = data.user.name;
            window.cachedProfileName = data.user.name;
        }
        const profileIdDisplay = document.getElementById('profile-id-display');
        if (profileIdDisplay) profileIdDisplay.textContent = data.user.id;
    }
}

function displaySubjects(subjects) {
    const output2 = document.getElementById("output2");
    if (!output2) return;
    output2.innerHTML = "<h3>Subjects</h3>";
    if (!subjects || subjects.length === 0) {
        output2.innerHTML += "<p>No attendance details found.</p>";
        return;
    }
    subjects.forEach(s => {
        const div = document.createElement("div");
        div.className = "subject-card";
        let predictorHtml = "";
        if (s.status_message) {
            const predictorClass = s.classes_needed > 0 ? "predictor-warning" : "predictor-safe";
            predictorHtml = `<span class="${predictorClass}">Predictor: ${s.status_message}</span>`;
        }
        div.innerHTML = `
            <div class="subject-header">
                <span class="subject-name">${s.subject_name}</span>
                <span class="subject-percent ${s.attendance_percentage < 75 ? 'text-danger' : 'text-success'}">${s.attendance_percentage}%</span>
            </div>
            <div class="subject-stats">Total: ${s.total_classes} | Attended: ${s.attended_classes}</div>
            <div>${predictorHtml}</div>
        `;
        output2.appendChild(div);
    });
}

function displayOverall(overall) {
    const output2 = document.getElementById("output2");
    if (!output2 || !overall) return;
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
