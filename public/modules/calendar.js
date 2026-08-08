import { fetchMonthlyLogsApi, saveAttendanceLogApi, updateProfileApi } from './api.js';
import { getUserId, formatDate } from './utils.js';
import { getPeriodsData } from './timetable.js';
import { Storage } from './storage.js';
import { markDirty } from './sync.js';
import { calculateNewStats } from './calculator.js';

let currentUserStartMarker = null;

function getStartMarker() {
    return currentUserStartMarker;
}

function setStartMarker(value) {
    currentUserStartMarker = value || null;
}

let currentViewDate = new Date();
let selectedDate = new Date();
let attendanceLogsCache = [];
let fetchLogsTimeout = null;
let isFetchingLogs = false;
let pendingLogsQueue = []; // Queue for bulk sync

// Global click listener to close attendance slot action overlays when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.attendance-slot')) {
        document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
    }
});

export function initCalendar() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');

    if (prevBtn && !prevBtn.dataset.listener) {
        prevBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            attendanceLogsCache = [];
            renderCalendar();
            debouncedFetchLogs();
        });
        prevBtn.dataset.listener = 'true';
    }

    if (nextBtn && !nextBtn.dataset.listener) {
        nextBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
            attendanceLogsCache = [];
            renderCalendar();
            debouncedFetchLogs();
        });
        nextBtn.dataset.listener = 'true';
    }

    if (prevDayBtn && !prevDayBtn.dataset.listener) {
        prevDayBtn.addEventListener('click', () => {
            const oldMonth = selectedDate.getMonth();
            const oldYear = selectedDate.getFullYear();
            selectedDate.setDate(selectedDate.getDate() - 1);
            handleDateChange(oldMonth, oldYear);
        });
        prevDayBtn.dataset.listener = 'true';
    }

    if (nextDayBtn && !nextDayBtn.dataset.listener) {
        nextDayBtn.addEventListener('click', () => {
            const oldMonth = selectedDate.getMonth();
            const oldYear = selectedDate.getFullYear();
            selectedDate.setDate(selectedDate.getDate() + 1);
            handleDateChange(oldMonth, oldYear);
        });
        nextDayBtn.dataset.listener = 'true';
    }

    attendanceLogsCache = [];

    renderCalendar();
    debouncedFetchLogs();
    renderDayAttendance();
    updateMarkerButton();

    checkAndPromptStartMarker();
}

function hasSetupSubjectsAndTimetable() {
    const subjects = window.cachedSubjects || [];
    const timetable = getPeriodsData();

    const hasSubjects = Array.isArray(subjects) && subjects.length > 0;
    if (!hasSubjects) return false;

    let hasTimetable = false;
    if (timetable && typeof timetable === 'object') {
        const days = Object.keys(timetable);
        for (const day of days) {
            const periods = timetable[day] || [];
            if (Array.isArray(periods)) {
                const filled = periods.some(p => p && p.name && p.name.trim() !== '');
                if (filled) {
                    hasTimetable = true;
                    break;
                }
            }
        }
    }
    return hasTimetable;
}

export function checkAndPromptStartMarker() {
    const startMarkerStr = getStartMarker();
    if (!startMarkerStr && !window.hasAlertedStartMarker && hasSetupSubjectsAndTimetable()) {
        setTimeout(() => {
            const freshMarker = getStartMarker();
            if (!freshMarker && !window.hasAlertedStartMarker && hasSetupSubjectsAndTimetable()) {
                promptForStartMarker("Welcome! You haven't set a Start Marker yet. Choose an option below to get started:");
                window.hasAlertedStartMarker = true;
            }
        }, 1500);
    }
}

export function refreshCalendarUI() {
    renderCalendar();
    renderDayAttendance();
    updateMarkerButton();
    checkAndPromptStartMarker();
}
window.refreshCalendarUI = refreshCalendarUI;

function handleDateChange(oldMonth, oldYear) {
    const newMonth = selectedDate.getMonth();
    const newYear = selectedDate.getFullYear();
    if (oldMonth !== newMonth || oldYear !== newYear) {
        currentViewDate = new Date(newYear, newMonth, 1);
        attendanceLogsCache = [];
        renderCalendar();
        debouncedFetchLogs();
    } else {
        renderDayAttendance();
    }
}

export function debouncedFetchLogs() {
    if (fetchLogsTimeout) clearTimeout(fetchLogsTimeout);
    fetchLogsTimeout = setTimeout(() => fetchMonthlyLogs(), 400);
}



async function fetchMonthlyLogs() {
    const userId = getUserId();

    if (!userId) return;

    await _fetchMonthlyLogsInternal(userId);
}

async function _fetchMonthlyLogsInternal(userId) {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    isFetchingLogs = true;
    try {
        const freshLogs = await fetchMonthlyLogsApi(year, month);

        // Merge unsaved pending changes to prevent background fetch from overwriting user edits
        const protectedLogs = [...pendingLogsQueue];
        if (protectedLogs.length > 0) {
            protectedLogs.forEach(pendingLog => {
                const idx = freshLogs.findIndex(l => {
                    // Match by real DB id
                    if (pendingLog.id && !String(pendingLog.id).startsWith('temp_') && l.id === pendingLog.id) return true;
                    // Match by timetable slot (for regular classes)
                    if (pendingLog.timetableId && formatDate(l.date) === pendingLog.date && Number(l.timetable_id) === Number(pendingLog.timetableId)) return true;
                    return false;
                });

                if (pendingLog.status === 'clear') {
                    if (idx > -1) freshLogs.splice(idx, 1);
                } else if (idx > -1) {
                    freshLogs[idx].status = pendingLog.status;
                } else {
                    // Not found in server data — this is a new entry (likely extra class with temp_ id)
                    // Only add if it's not already represented (avoid duplicates)
                    const alreadyAdded = freshLogs.some(l =>
                        pendingLog.id && l.id === pendingLog.id
                    );
                    if (!alreadyAdded) {
                        freshLogs.push({
                            id: pendingLog.id || `temp_${Date.now()}`,
                            date: pendingLog.date,
                            subject_id: pendingLog.subjectId,
                            timetable_id: pendingLog.timetableId || null,
                            status: pendingLog.status,
                            subject_name: pendingLog.subjectName
                        });
                    }
                }
            });
        }

        attendanceLogsCache = freshLogs;
    } catch (err) {
        console.error("Error fetching logs:", err);
    } finally {
        isFetchingLogs = false;
        renderCalendar();
        renderDayAttendance();
    }
}

export function renderCalendar() {
    const calendarGrid = document.getElementById('calendarDays');
    const currentMonthLabel = document.getElementById('monthDisplay');
    if (!calendarGrid || !currentMonthLabel) return;

    calendarGrid.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        if (dateStr === formatDate(new Date())) dayDiv.classList.add('today');
        if (dateStr === formatDate(selectedDate)) dayDiv.classList.add('selected');
        if (date.getDay() === 0) dayDiv.classList.add('sunday');

        const dayLogs = attendanceLogsCache.filter(l => formatDate(l.date) === dateStr);
        const markersContainer = document.createElement('div');
        markersContainer.className = 'day-markers';

        // Pending check: if it's a previous day and has periods but NO logs for some periods
        const startMarkerStr = getStartMarker();
        const startMarkerDate = startMarkerStr ? new Date(startMarkerStr) : null;
        if (startMarkerDate) startMarkerDate.setHours(0, 0, 0, 0);
        const currentDateObj = new Date(date);
        currentDateObj.setHours(0, 0, 0, 0);
        const isPast = currentDateObj < new Date(new Date().setHours(0, 0, 0, 0)) && (!startMarkerDate || currentDateObj >= startMarkerDate);

        const dayPeriods = getPeriodsData()[date.toLocaleDateString('en-US', { weekday: 'long' })] || [];

        // Build set of subject IDs from timetable periods (to distinguish timetable logs from true extra classes)
        const timetableSubjectIds = new Set(dayPeriods.filter(p => p.name).map(p => Number(p.id)));

        // Extra = logs without timetable_id that also don't belong to any timetable period's subject
        let hasExtra = dayLogs.some(l => !l.timetable_id && !timetableSubjectIds.has(Number(l.subject_id)));
        let hasCancelled = dayLogs.some(l => l.status === 'cancelled');

        const hasPending = isPast && dayPeriods.some(p => {
            if (!p.name) return false;
            if (p.timetableId) return !dayLogs.some(l => Number(l.timetable_id) === Number(p.timetableId));
            // Unsynced period: check by subject_id
            return !dayLogs.some(l => Number(l.subject_id) === Number(p.id) && !l.timetable_id);
        });

        if (hasExtra) markersContainer.innerHTML += '<span class="marker marker-e">E</span>';
        if (hasCancelled) markersContainer.innerHTML += '<span class="marker marker-c">C</span>';
        if (hasPending) markersContainer.innerHTML += '<span class="marker marker-p">P</span>';
        if (startMarkerStr && startMarkerStr === dateStr) {
            markersContainer.innerHTML += '<span class="marker marker-s" style="background: #3b82f6; color: white; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; padding: 0;">S</span>';
        }

        dayDiv.appendChild(markersContainer);

        if (dayLogs.length > 0) {
            const hasAbsent = dayLogs.some(l => l.status === 'absent');
            const hasPresent = dayLogs.some(l => l.status === 'present');
            const allAbsent = dayLogs.every(l => l.status === 'absent' || l.status === 'cancelled') && hasAbsent;
            const allPresent = dayLogs.every(l => l.status === 'present' || l.status === 'cancelled') && hasPresent;
            const isMixed = hasAbsent && hasPresent;

            if (isMixed) dayDiv.classList.add('cal-mixed');
            else if (allAbsent) dayDiv.classList.add('cal-absent');
            else if (allPresent) dayDiv.classList.add('cal-present');
        }

        dayDiv.onclick = () => {
            selectedDate = new Date(year, month, day);
            renderCalendar();
            renderDayAttendance();
            updateMarkerButton();
        };

        calendarGrid.appendChild(dayDiv);
    }
}

export function renderDayAttendance() {
    const dateDisplay = document.getElementById('selectedDateDisplay');
    const slotsWrapper = document.getElementById('daySlotsWrapper');
    if (!dateDisplay || !slotsWrapper) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = selectedDate.toLocaleDateString(undefined, options);
    slotsWrapper.innerHTML = '';
    const periodsData = getPeriodsData();
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySubjects = periodsData[dayName] || [];
    if (daySubjects.length === 0) {
        slotsWrapper.innerHTML = '<p style="color: #64748b; font-style: italic; padding: 20px;">No subjects scheduled.</p>';
        return;
    }
    const selectedDateStr = formatDate(selectedDate);
    const claimedLogIds = new Set(); // Track logs matched to timetable periods

    const startMarkerStr = getStartMarker();
    const startMarkerDate = startMarkerStr ? new Date(startMarkerStr) : null;
    if (startMarkerDate) startMarkerDate.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);
    const isBeforeStartMarker = !startMarkerStr || (startMarkerDate && selectedDateObj < startMarkerDate);

    daySubjects.forEach(subject => {
        if (!subject.name) return;
        let log;
        if (subject.timetableId) {
            // Synced period — match by timetable_id
            log = attendanceLogsCache.find(l => formatDate(l.date) === selectedDateStr && Number(l.timetable_id) === Number(subject.timetableId));
        } else {
            // Unsynced period (no timetableId yet) — fall back to subject_id + date match
            // Only match logs that don't have a timetable_id and haven't been claimed already
            log = attendanceLogsCache.find(l => formatDate(l.date) === selectedDateStr && Number(l.subject_id) === Number(subject.id) && !l.timetable_id && !claimedLogIds.has(l.id));
        }
        if (log) claimedLogIds.add(log.id);
        let status = log ? log.status : 'pending';
        if (isFetchingLogs && !log) status = 'loading';

        const slot = document.createElement('div');
        slot.className = `attendance-slot slot-${status}`;

        let overlayHtml = '';
        if (!isBeforeStartMarker) {
            overlayHtml = `
            <div class="slot-actions-overlay">
                <button class="overlay-btn btn-present-mini" data-status="present">Present</button>
                <button class="overlay-btn btn-absent-mini" data-status="absent">Absent</button>
                <button class="overlay-btn btn-cancelled-mini" data-status="cancelled">Cancelled</button>
                <button class="overlay-btn btn-clear-mini" data-status="clear">Clear</button>
            </div>
            `;
        }

        slot.innerHTML = `
            <div class="slot-content">
                <span class="slot-subject-name">${subject.name}</span>
                <div class="slot-status-badge status-${status}">${status}</div>
            </div>
            ${overlayHtml}
        `;

        if (!isBeforeStartMarker) {
            slot.querySelectorAll('.overlay-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    markAttendance(subject.name, btn.dataset.status, e, subject.timetableId || null, subject.id, log ? log.id : null);
                };
            });
            slot.onclick = () => {
                const isShowing = slot.classList.contains('show-actions');
                document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
                if (!isShowing) slot.classList.add('show-actions');
            };
        } else {
            slot.style.opacity = '0.6';
            slot.onclick = () => {
                if (!startMarkerStr) {
                    promptForStartMarker();
                } else if (window.customAlert) {
                    window.customAlert('Cannot edit attendance before the start marker.', 'Info', 'info');
                }
            };
        }
        slotsWrapper.appendChild(slot);
    });
    renderExtraClasses(selectedDateStr, slotsWrapper, claimedLogIds);
}

function renderExtraClasses(selectedDateStr, slotsWrapper, claimedLogIds = new Set()) {
    const startMarkerStr = getStartMarker();
    const startMarkerDate = startMarkerStr ? new Date(startMarkerStr) : null;
    if (startMarkerDate) startMarkerDate.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDateStr);
    selectedDateObj.setHours(0, 0, 0, 0);
    const isBeforeStartMarker = !startMarkerStr || (startMarkerDate && selectedDateObj < startMarkerDate);

    const extraLogs = attendanceLogsCache.filter(l => formatDate(l.date) === selectedDateStr && !l.timetable_id && !claimedLogIds.has(l.id));
    if (extraLogs.length > 0) {
        extraLogs.forEach(log => {
            const slot = document.createElement('div');
            slot.className = 'attendance-slot extra-slot';
            let overlayHtml = '';
            if (!isBeforeStartMarker) {
                overlayHtml = `
                <div class="slot-actions-overlay">
                    <button class="overlay-btn btn-present-mini" data-status="present">Present</button>
                    <button class="overlay-btn btn-absent-mini" data-status="absent">Absent</button>
                    <button class="overlay-btn btn-clear-mini" data-status="clear">Remove</button>
                </div>
                `;
            }

            slot.innerHTML = `
                <div class="slot-content">
                    <div style="display:flex; flex-direction:column;">
                        <span class="slot-subject-name">${log.subject_name}</span>
                        <small style="color: #64748b; font-size: 0.7rem;">Extra Class</small>
                    </div>
                    <div class="slot-status-badge status-${log.status}">${log.status}</div>
                </div>
                ${overlayHtml}
            `;

            if (!isBeforeStartMarker) {
                slot.querySelectorAll('.overlay-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        markAttendance(log.subject_name, btn.dataset.status, e, null, log.subject_id, log.id);
                    };
                });
                slot.onclick = () => {
                    const isShowing = slot.classList.contains('show-actions');
                    document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
                    if (!isShowing) slot.classList.add('show-actions');
                };
            } else {
                slot.style.opacity = '0.6';
                slot.onclick = () => {
                    if (!startMarkerStr) {
                        promptForStartMarker();
                    } else if (window.customAlert) {
                        window.customAlert('Cannot edit attendance before the start marker.', 'Info', 'info');
                    }
                };
            }
            slotsWrapper.appendChild(slot);
        });
    }
}

export async function markAttendance(subjectName, status, event, timetableId, subjectId, logId = null, isNewExtraClass = false) {
    if (event) event.stopPropagation();
    const userId = getUserId();
    const dateStr = formatDate(selectedDate);

    // 1. Find old status for calculations
    const existingIndex = isNewExtraClass ? -1 : attendanceLogsCache.findIndex(l =>
        (logId && l.id === logId) || (formatDate(l.date) === dateStr && (timetableId ? Number(l.timetable_id) === Number(timetableId) : false))
    );
    const oldStatus = existingIndex > -1 ? attendanceLogsCache[existingIndex].status : 'pending';

    // 2. Instant local update for calendar
    if (status === 'clear') {
        if (existingIndex > -1) attendanceLogsCache.splice(existingIndex, 1);
    } else if (existingIndex > -1) {
        attendanceLogsCache[existingIndex].status = status;
        logId = attendanceLogsCache[existingIndex].id;
    } else {
        logId = logId || `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        attendanceLogsCache.push({ id: logId, date: dateStr, subject_id: subjectId, timetable_id: timetableId, status, subject_name: subjectName });
    }

    renderCalendar();
    renderDayAttendance();

    // 3. Instant local update for dashboard stats
    if (oldStatus !== status && window.latestDashboardData) {
        const updatedDashboard = calculateNewStats(window.latestDashboardData, subjectId, oldStatus, status);
        window.latestDashboardData = updatedDashboard;
        if (window.refreshDashboard) window.refreshDashboard(updatedDashboard, ['subjects', 'timetable']);
    }

    // 4. Queue for manual sync
    const logData = { id: logId, date: dateStr, subjectId, timetableId, status, subjectName };
    const queueIdx = pendingLogsQueue.findIndex(l =>
        (logId && l.id === logId) || (l.date === dateStr && (timetableId ? l.timetableId === timetableId : false))
    );
    if (queueIdx > -1) pendingLogsQueue[queueIdx] = logData;
    else pendingLogsQueue.push(logData);

    markDirty('attendance');
}

export async function markWholeDay(status) {
    const startMarkerStr = getStartMarker();
    if (!startMarkerStr) {
        promptForStartMarker();
        return;
    }
    if (startMarkerStr) {
        const startMarkerDate = new Date(startMarkerStr);
        startMarkerDate.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        if (selectedDateObj < startMarkerDate) {
            if (window.customAlert) window.customAlert('Cannot edit attendance before the start marker.', 'Info', 'info');
            return;
        }
    }

    const userId = getUserId();
    const dateStr = formatDate(selectedDate);
    const daySubjects = getPeriodsData()[selectedDate.toLocaleDateString('en-US', { weekday: 'long' })] || [];
    const newLogs = daySubjects.filter(s => s.name).map(s => ({ date: dateStr, subjectId: s.id, timetableId: s.timetableId, status: status === 'holiday' ? 'cancelled' : status, subjectName: s.name }));

    if (newLogs.length === 0) return;

    let dashboardCache = window.latestDashboardData || null;

    newLogs.forEach(newLog => {
        // Local calendar update
        const idx = attendanceLogsCache.findIndex(l => formatDate(l.date) === dateStr && Number(l.timetable_id) === Number(newLog.timetableId));
        const oldStatus = idx > -1 ? attendanceLogsCache[idx].status : 'pending';

        if (status === 'clear') {
            if (idx > -1) attendanceLogsCache.splice(idx, 1);
        } else if (idx > -1) {
            attendanceLogsCache[idx].status = newLog.status;
        } else {
            attendanceLogsCache.push({ ...newLog, timetable_id: newLog.timetableId, subject_id: newLog.subjectId });
        }

        // Local dashboard update
        if (dashboardCache && oldStatus !== newLog.status) {
            dashboardCache = calculateNewStats(dashboardCache, newLog.subjectId, oldStatus, newLog.status);
        }

        // Add to sync queue
        const qIdx = pendingLogsQueue.findIndex(l => l.date === dateStr && l.timetableId === newLog.timetableId);
        if (qIdx > -1) pendingLogsQueue[qIdx] = newLog;
        else pendingLogsQueue.push(newLog);
    });

    if (dashboardCache) {
        window.latestDashboardData = dashboardCache;
        if (window.refreshDashboard) window.refreshDashboard(dashboardCache, ['subjects', 'timetable']);
    }

    renderCalendar();
    renderDayAttendance();

    markDirty('attendance');
}

export function getPendingLogsToSave() {
    const logsToSync = [...pendingLogsQueue];
    pendingLogsQueue = [];
    return logsToSync;
}

export async function refreshLogsAfterSave() {
    const userId = getUserId();
    if (userId) {
        await _fetchMonthlyLogsInternal(userId);
    }
}

export function openExtraClassModal() {
    const startMarkerStr = getStartMarker();
    if (!startMarkerStr) {
        promptForStartMarker();
        return;
    }
    if (startMarkerStr) {
        const startMarkerDate = new Date(startMarkerStr);
        startMarkerDate.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        if (selectedDateObj < startMarkerDate) {
            if (window.customAlert) window.customAlert('Cannot edit attendance before the start marker.', 'Info', 'info');
            return;
        }
    }

    const modal = document.getElementById('extraClassModal');
    const select = document.getElementById('extra-subject-select');
    if (!modal || !select) return;
    select.innerHTML = '<option value="">Select a subject</option>';
    (window.cachedSubjects || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
    modal.style.display = 'flex';
    // Small timeout to allow display:flex to apply before adding opacity transition
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

export function closeExtraClassModal() {
    const modal = document.getElementById('extraClassModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for transition
    }
}

export async function saveExtraClass() {
    const select = document.getElementById('extra-subject-select');
    const statusSelect = document.getElementById('extra-status-select');
    if (!select || !statusSelect) return;
    const subjectId = select.value;
    const subjectName = select.options[select.selectedIndex].text;
    const status = statusSelect.value;
    if (!subjectId) return;
    await markAttendance(subjectName, status, null, null, subjectId, null, true);
    closeExtraClassModal();
}

export function updateAttendanceCacheNames(subjects) {
    attendanceLogsCache.forEach(log => {
        const match = subjects.find(s => s.subject_id == log.subject_id);
        if (match) {
            log.subject_name = match.subject_name;
        }
    });
}

export function toggleStartMarker() {
    const currentMarker = getStartMarker();
    const selectedDateStr = formatDate(selectedDate);

    if (currentMarker) {
        setStartMarker(null);
        if (window.latestDashboardData && window.latestDashboardData.user) {
            window.latestDashboardData.user.startMarker = null;
        }
        updateProfileApi({ startMarker: null }).catch(err => console.error("Failed to sync start marker:", err));
        console.log('Start marker removed');
    } else {
        setStartMarker(selectedDateStr);
        if (window.latestDashboardData && window.latestDashboardData.user) {
            window.latestDashboardData.user.startMarker = selectedDateStr;
        }
        updateProfileApi({ startMarker: selectedDateStr }).catch(err => console.error("Failed to sync start marker:", err));
        console.log('Start marker set to ' + selectedDateStr);
    }
    renderCalendar();
    renderDayAttendance();
    updateMarkerButton();
}

export function updateMarkerButton() {
    const btn = document.getElementById('toggleMarkerBtn');
    if (!btn) return;
    const currentMarker = getStartMarker();

    if (currentMarker) {
        btn.textContent = `Remove Marker (${currentMarker})`;
        btn.className = 'bulk-btn btn-cancelled-mini'; // Use existing red button style
        btn.style.background = '#94a3b8'; // Make it grey when already added
        btn.style.color = '#fff';
    } else {
        btn.textContent = 'Set Start Marker Here';
        btn.className = 'bulk-btn btn-present-mini'; // Green base
        btn.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)'; // Vibrant gradient
        btn.style.color = '#fff';
    }
}

export async function promptForStartMarker(customMessage = 'Please set a Start Marker first.') {
    if (window.customConfirm) {
        // Change the options so humans don't have to read long texts:
        // Option 1 (Cancel/First): "How to Set"
        // Option 2 (Proceed/Second): "Set Marker"
        const action = await window.customConfirm(
            customMessage,
            'Action Required',
            'warning',
            'How to Set',
            'Set Marker'
        );

        if (action === false) {
            // "How to Set" option clicked: Open the How to Use guide and scroll to it with a violet glow!
            const helpLink = document.querySelector('a[data-section="help-section"]');
            if (window.showSection) window.showSection('help-section', helpLink);

            // Wait for section to activate, then scroll & glow the block
            setTimeout(() => {
                const el = document.getElementById('help-attendance');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'all 0.5s ease';
                    el.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.9)';
                    el.style.borderColor = 'rgba(139, 92, 246, 1)';
                    setTimeout(() => {
                        el.style.boxShadow = '';
                        el.style.borderColor = '';
                    }, 2000);
                }
            }, 250);
            return;
        } else {
            // "Set Marker" option clicked: Navigate to attendance and scroll to the blue button with a blue glow!
            const attLink = document.querySelector('a[data-section="attendance-section"]');
            if (window.showSection) window.showSection('attendance-section', attLink);

            setTimeout(() => {
                const btn = document.getElementById('toggleMarkerBtn');
                if (btn) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.style.transition = 'all 0.4s ease';
                    btn.style.boxShadow = '0 0 35px rgba(59, 130, 246, 0.9)';
                    btn.style.transform = 'scale(1.06)';
                    setTimeout(() => {
                        btn.style.boxShadow = '';
                        btn.style.transform = '';
                    }, 1500);
                }
            }, 250);
        }
    } else if (window.customAlert) {
        await window.customAlert(customMessage, 'Action Required', 'warning');

        // Default to navigating to the attendance section and highlighting the marker button
        const attLink = document.querySelector('a[data-section="attendance-section"]');
        if (window.showSection) window.showSection('attendance-section', attLink);

        // Wait a tiny bit for the UI to show
        setTimeout(() => {
            const btn = document.getElementById('toggleMarkerBtn');
            if (btn) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                btn.classList.add('glow-animation');
                setTimeout(() => btn.classList.remove('glow-animation'), 1000);
            }
        }, 150);
    }
}

export function getOldestPendingDate() {
    const userId = getUserId();
    const startMarkerStr = getStartMarker();
    if (!startMarkerStr) return null;
    const startMarkerDate = new Date(startMarkerStr);
    startMarkerDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodsData = getPeriodsData();

    // Scan backwards from yesterday up to 60 days
    for (let d = 1; d <= 60; d++) {
        const checkDate = new Date();
        checkDate.setDate(today.getDate() - d);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < startMarkerDate) break;

        const dateStr = formatDate(checkDate);
        const year = checkDate.getFullYear();
        const month = checkDate.getMonth() + 1;

        const monthLogs = attendanceLogsCache.filter(l => {
            const logDate = new Date(l.date);
            return logDate.getFullYear() === year && logDate.getMonth() + 1 === month;
        });
        const dayLogs = monthLogs.filter(l => formatDate(l.date) === dateStr);

        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dayPeriods = periodsData[dayName] || [];

        const hasPending = dayPeriods.some(p => {
            if (!p.name) return false;
            if (p.timetableId) return !dayLogs.some(l => Number(l.timetable_id) === Number(p.timetableId));
            return !dayLogs.some(l => Number(l.subject_id) === Number(p.id) && !l.timetable_id);
        });

        if (hasPending) {
            return { date: checkDate, dateStr };
        }
    }
    return null;
}

export function openPendingDate(dateStr) {
    const targetDate = new Date(dateStr);
    selectedDate = targetDate;
    currentViewDate = new Date(targetDate); // Set the calendar view to this month/year too!

    attendanceLogsCache = [];

    // Switch view section to Attendance
    const attLink = document.querySelector('a[data-section="attendance-section"]');
    if (attLink && window.showSection) {
        window.showSection('attendance-section', attLink);
    }

    renderCalendar();
    renderDayAttendance();
    updateMarkerButton();

    // Fetch logs in background for freshness
    debouncedFetchLogs();
}

export function updateStartMarkerFromUser(user) {
    if (user && user.startMarker !== undefined) {
        setStartMarker(user.startMarker);
    }
}

window.updateStartMarkerFromUser = updateStartMarkerFromUser;
window.getOldestPendingDate = getOldestPendingDate;
window.openPendingDate = openPendingDate;

