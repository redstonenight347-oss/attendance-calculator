import { fetchDashboardData } from './modules/api.js';
import { getUserId } from './modules/utils.js';
import { Storage } from './modules/storage.js';
import { isDirty, getDirtyKeys, clearAllDirty, setSyncStatus, SyncStatus } from './modules/sync.js';
import {
    populateEditSubjects,
    addSubjectInput,
    deleteAllSubjects,
    getSubjectsToSave
} from './modules/subjects.js';
import {
    initTimetable,
    setAvailableSubjects,
    switchDay,
    addPeriod,
    getPeriodsData
} from './modules/timetable.js';
import {
    initCalendar,
    markAttendance,
    markWholeDay,
    openExtraClassModal,
    closeExtraClassModal,
    saveExtraClass,
    renderDayAttendance,
    updateAttendanceCacheNames,
    toggleStartMarker,
    getPendingLogsToSave,
    refreshLogsAfterSave
} from './modules/calendar.js';
import {
    saveProfile,
    copyUserId,
    openChangeEmailModal,
    closeChangeEmailModal,
    confirmChangeEmail,
    openChangePasswordModal,
    closeChangePasswordModal,
    requestPasswordOTP,
    confirmChangePassword
} from './modules/profile.js';
import { verifyTokenApi, saveSubjectsApi, saveTimetableApi, saveAttendanceLogApi } from './modules/api.js';
import { initTheme } from './modules/theme.js';


// Expose functions to global scope immediately for HTML onclicks
window.showSection = async (sectionId, navLink) => {
    if (isDirty()) {
        const proceed = window.customConfirm ?
            await window.customConfirm("You have unsaved changes. Navigating away will discard them.", "Unsaved Changes", "⚠️", "Edit", "Discard") :
            confirm("You have unsaved changes. Click OK to discard, or Cancel to edit.");

        if (!proceed) {
            // User chose Edit (Cancel)
            return;
        }

        // User chose Discard
        clearAllDirty();
        window.refreshDashboard(); // Re-render DOM from server data
    }

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
window.saveProfile = saveProfile;
window.copyUserId = copyUserId;
window.markAttendance = markAttendance;
window.markWholeDay = markWholeDay;
window.showAddExtraClassModal = openExtraClassModal;
window.closeExtraClassModal = closeExtraClassModal;
window.saveExtraClass = saveExtraClass;
window.renderDayAttendance = renderDayAttendance;
window.updateAttendanceCacheNames = updateAttendanceCacheNames;
window.toggleStartMarker = toggleStartMarker;

window.openHelp = (target) => {
    // Find the link for "How to Use" to pass it to showSection for active states
    const helpLink = document.querySelector('a[onclick*="help-section"]');
    window.showSection('help-section', helpLink);

    setTimeout(() => {
        const element = document.getElementById(`help-${target}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-help');
            setTimeout(() => element.classList.remove('highlight-help'), 2000);
        }
    }, 100);
};

window.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/';
};


async function initialize(userId) {
    // Initialize global refresh function
    window.refreshDashboard = (data = null, skipSections = []) => {
        if (data) {
            // Merge with existing data to prevent wiping other sections when only partial data is provided (optimistic UI)
            const mergedData = { ...window.latestDashboardData };
            if (data.subjects !== null && data.subjects !== undefined) mergedData.subjects = data.subjects;
            if (data.overall !== null && data.overall !== undefined) mergedData.overall = data.overall;
            if (data.timetable !== null && data.timetable !== undefined) mergedData.timetable = data.timetable;
            if (data.user !== null && data.user !== undefined) mergedData.user = data.user;

            renderDashboardUI(mergedData, skipSections);
            return;
        }
        loadDashboardData(userId, false);
    };

    // Always load fresh data from the server; no local cache for dashboard data
    loadDashboardData(userId, true);
}

function bindDashboardEvents() {
    // 1. Sidebar Navigation Links
    document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            window.showSection(sectionId, link);
        });
    });

    // 2. View Profile Link
    const viewProfileLink = document.getElementById('view-profile-link');
    if (viewProfileLink) {
        viewProfileLink.addEventListener('click', () => {
            window.showSection('profile-section', null);
        });
    }

    // 3. Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.logout);
    }

    // 4. Info Help Buttons
    document.querySelectorAll('.info-btn[data-help]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-help');
            window.openHelp(target);
        });
    });

    // 5. Subjects Add Input Button
    const addSubjectInputBtn = document.getElementById('add-subject-input-btn');
    if (addSubjectInputBtn) {
        addSubjectInputBtn.addEventListener('click', addSubjectInput);
    }

    // 6. Timetable Day Buttons
    document.querySelectorAll('.day-btn[data-day]').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = btn.getAttribute('data-day');
            switchDay(day);
        });
    });

    // 7. Timetable Add Period Button
    const addPeriodBtn = document.getElementById('add-period-btn');
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', addPeriod);
    }

    // 8. Attendance Bulk Buttons
    const bulkPresentBtn = document.getElementById('bulk-present-btn');
    if (bulkPresentBtn) bulkPresentBtn.addEventListener('click', () => markWholeDay('present'));

    const bulkAbsentBtn = document.getElementById('bulk-absent-btn');
    if (bulkAbsentBtn) bulkAbsentBtn.addEventListener('click', () => markWholeDay('absent'));

    const bulkHolidayBtn = document.getElementById('bulk-holiday-btn');
    if (bulkHolidayBtn) bulkHolidayBtn.addEventListener('click', () => markWholeDay('holiday'));

    const bulkClearBtn = document.getElementById('bulk-clear-btn');
    if (bulkClearBtn) bulkClearBtn.addEventListener('click', () => markWholeDay('clear'));

    const addExtraClassBtn = document.getElementById('add-extra-class-btn');
    if (addExtraClassBtn) addExtraClassBtn.addEventListener('click', openExtraClassModal);

    const toggleMarkerBtn = document.getElementById('toggleMarkerBtn');
    if (toggleMarkerBtn) toggleMarkerBtn.addEventListener('click', toggleStartMarker);

    // 9. Profile Settings & Actions
    const copyUserIdContainer = document.getElementById('copy-user-id-container');
    if (copyUserIdContainer) {
        copyUserIdContainer.addEventListener('click', copyUserId);
    }

    const openChangeEmailBtn = document.getElementById('open-change-email-btn');
    if (openChangeEmailBtn) {
        openChangeEmailBtn.addEventListener('click', openChangeEmailModal);
    }

    const openChangePasswordBtn = document.getElementById('open-change-password-btn');
    if (openChangePasswordBtn) {
        openChangePasswordBtn.addEventListener('click', openChangePasswordModal);
    }

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    // 10. Modal Buttons
    const cancelChangeEmailBtn = document.getElementById('cancel-change-email-btn');
    if (cancelChangeEmailBtn) cancelChangeEmailBtn.addEventListener('click', closeChangeEmailModal);

    const confirmChangeEmailBtn = document.getElementById('confirm-change-email-btn');
    if (confirmChangeEmailBtn) {
        confirmChangeEmailBtn.addEventListener('click', function () {
            confirmChangeEmail(confirmChangeEmailBtn);
        });
    }

    const cancelChangePasswordBtn = document.getElementById('cancel-change-password-btn');
    if (cancelChangePasswordBtn) cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);

    const btnRequestOtp = document.getElementById('btn-request-otp');
    if (btnRequestOtp) {
        btnRequestOtp.addEventListener('click', function () {
            requestPasswordOTP(btnRequestOtp);
        });
    }

    const newPasswordToggle = document.getElementById('new-password-toggle');
    if (newPasswordToggle) {
        newPasswordToggle.addEventListener('click', () => {
            if (typeof window.togglePasswordVisibility === 'function') {
                window.togglePasswordVisibility('new-password-input', newPasswordToggle);
            }
        });
    }

    const cancelChangePasswordStep2Btn = document.getElementById('cancel-change-password-step2-btn');
    if (cancelChangePasswordStep2Btn) cancelChangePasswordStep2Btn.addEventListener('click', closeChangePasswordModal);

    const btnConfirmPassword = document.getElementById('btn-confirm-password');
    if (btnConfirmPassword) {
        btnConfirmPassword.addEventListener('click', function () {
            confirmChangePassword(btnConfirmPassword);
        });
    }

    const cancelExtraClassBtn = document.getElementById('cancel-extra-class-btn');
    if (cancelExtraClassBtn) cancelExtraClassBtn.addEventListener('click', closeExtraClassModal);

    const confirmExtraClassBtn = document.getElementById('confirm-extra-class-btn');
    if (confirmExtraClassBtn) confirmExtraClassBtn.addEventListener('click', saveExtraClass);

    // 11. Global Save Button
    const globalSaveBtn = document.getElementById('global-save-btn');
    if (globalSaveBtn) {
        globalSaveBtn.addEventListener('click', saveAllChanges);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    bindDashboardEvents();

    // Mobile Header Scroll Logic
    let lastScrollTop = 0;
    const mobileHeader = document.querySelector('.mobile-header');
    const mainContent = document.querySelector('.main-content');

    mainContent.addEventListener('scroll', () => {
        let scrollTop = mainContent.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            // Scroll Down
            mobileHeader.classList.add('nav-up');
        } else {
            // Scroll Up
            mobileHeader.classList.remove('nav-up');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);

    const userId = getUserId();
    const token = localStorage.getItem('token');

    if (!userId || !token) {
        window.location.href = '/';
        return;
    }

    // Verify token and potentially refresh user info
    try {
        await verifyTokenApi();
        initialize(userId);
    } catch (err) {
        console.error("Session verification failed:", err);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/';
    }
});

async function loadDashboardData(userId, showLoading = false) {
    const output2 = document.querySelector("#output2");
    if (showLoading && output2) output2.innerHTML = "Loading attendance...";

    try {
        const data = await fetchDashboardData();

        // We don't skip background data update anymore since saves are manual.
        // The optimistic UI logic already skips rendering sections currently being edited.

        // Start marker is kept in sync via updateStartMarkerFromUser below

        if (output2 && showLoading) output2.innerHTML = "";

        const skipSections = [];
        if (isEditingSubjects()) skipSections.push('subjects');
        if (isEditingTimetable()) skipSections.push('timetable');
        renderDashboardUI(data, skipSections);

        if (showLoading) {
            initCalendar();
        } else {
            if (typeof window.refreshCalendarUI === 'function') {
                window.refreshCalendarUI();
            }
        }
    } catch (err) {
        console.error("Dashboard load error:", err);
        if (showLoading && output2) output2.textContent = err.message || "Something went wrong";
    }
}

function isEditingSubjects() {
    const list = document.getElementById('subjects-list');
    if (!list) return false;
    return list.contains(document.activeElement);
}

function isEditingTimetable() {
    return document.body.classList.contains('timetable-editing');
}

function renderDashboardUI(data, skipSections = []) {
    // Keep latest dashboard data in memory for calendar/profile optimistic updates
    window.latestDashboardData = data;

    // Always update the main dashboard view
    displaySubjects(data.subjects);
    displayOverall(data.overall);
    checkAndDisplayPendingWarning();

    // Only update edit forms if not explicitly skipped (to avoid focus loss)
    if (!skipSections.includes('subjects')) {
        populateEditSubjects(data.subjects);
    }

    if (!skipSections.includes('timetable')) {
        setAvailableSubjects(data.subjects);
        initTimetable(data.timetable);
        if (typeof window.renderDayAttendance === 'function') {
            window.renderDayAttendance();
        }
    }

    // Sync start marker from DB user profile to calendar module
    if (data.user && typeof window.updateStartMarkerFromUser === 'function') {
        window.updateStartMarkerFromUser(data.user);
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

        const profileEmailDisplay = document.getElementById('profile-email-display');
        if (profileEmailDisplay && data.user.email) profileEmailDisplay.textContent = data.user.email;
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

// Sidebar toggle & helper handlers (migrated from inline HTML script)
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        }
    }

    function closeSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }

    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    window.closeSidebar = closeSidebar;
    window.openSidebar = openSidebar;
});

function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === "password") {
            input.type = "text";
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-5 h-5 text-slate-400"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`;
        } else {
            input.type = "password";
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-5 h-5 text-slate-400"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
        }
    }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function checkAndDisplayPendingWarning() {
    const output2 = document.getElementById("output2");
    if (!output2) return;

    // Remove any existing banner first
    const existing = document.querySelector('.pending-warning-banner');
    if (existing) existing.remove();

    if (typeof window.getOldestPendingDate !== 'function') return;

    const pendingInfo = window.getOldestPendingDate();
    if (!pendingInfo) return;

    // Create the banner container
    const banner = document.createElement('div');
    banner.className = 'pending-warning-banner';
    banner.style.cssText = `
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-left: 5px solid #f59e0b;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    `;

    const dayName = pendingInfo.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" style="width: 24px; height: 24px; color: #f59e0b; flex-shrink: 0;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
                <strong style="color: #d97706; font-size: 1.05rem; display: block; margin-bottom: 3px;">Pending Attendance Logs</strong>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">You have unlogged attendance for <strong>${dayName}</strong>.</span>
            </div>
        </div>
        <button id="resolve-pending-btn" class="bulk-btn btn-present-mini" style="background: #f59e0b; color: white; border: none; width: auto; padding: 8px 16px; margin: 0; font-size: 0.85rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">Log Now</button>
    `;

    // Insert banner at the very top of output2
    output2.insertBefore(banner, output2.firstChild);

    // Bind event listener
    const resolveBtn = banner.querySelector('#resolve-pending-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', async () => {
            if (window.customConfirm) {
                const proceed = await window.customConfirm(
                    `Would you like to directly open ${dayName} to fill in your pending attendance logs?`,
                    "Pending Attendance Logs",
                    "⚠️"
                );
                if (proceed && typeof window.openPendingDate === 'function') {
                    window.openPendingDate(pendingInfo.dateStr);
                }
            } else if (confirm(`Open ${dayName} to log pending attendance?`)) {
                if (typeof window.openPendingDate === 'function') {
                    window.openPendingDate(pendingInfo.dateStr);
                }
            }
        });
    }
}
window.checkAndDisplayPendingWarning = checkAndDisplayPendingWarning;

async function saveAllChanges() {
    if (!isDirty()) return;

    if (window.customConfirm) {
        const proceed = await window.customConfirm("Are you sure you want to save all changes?", "Save Changes", "save");
        if (!proceed) return;
    } else {
        if (!confirm("Are you sure you want to save all changes?")) return;
    }

    const dirtyKeys = getDirtyKeys();
    setSyncStatus(SyncStatus.SAVING);

    const saveBtn = document.getElementById('global-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    try {
        if (dirtyKeys.includes('subjects')) {
            const subjectsToSave = getSubjectsToSave();
            await saveSubjectsApi(subjectsToSave);
        }

        if (dirtyKeys.includes('timetable')) {
            const timetableData = getPeriodsData();
            await saveTimetableApi(timetableData);
        }

        if (dirtyKeys.includes('attendance')) {
            const pendingLogs = getPendingLogsToSave();
            await saveAttendanceLogApi(pendingLogs);
            await refreshLogsAfterSave();
        }

        clearAllDirty();

        if (window.customAlert) {
            await window.customAlert("All changes saved successfully!", "Success", "success");
        } else {
            alert("All changes saved successfully!");
        }

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 inline-block mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5M12 12l4.5 4.5M16.5 16.5l4.5-4.5M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" /></svg> Save Changes`;
        }

        // Fetch the new fresh data from the DB to ensure UI is completely up to date
        window.refreshDashboard();

    } catch (err) {
        console.error("Failed to save changes:", err);
        setSyncStatus(SyncStatus.ERROR, true);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 inline-block mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5M12 12l4.5 4.5M16.5 16.5l4.5-4.5M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5" /></svg> Save Changes`;
        }
        if (window.customAlert) {
            window.customAlert("Failed to save changes. Please try again.", "Save Failed", "error");
        } else {
            alert("Failed to save changes. Please try again.");
        }
    }
}
window.saveAllChanges = saveAllChanges;
