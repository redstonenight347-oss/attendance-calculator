import { fetchMonthlyLogsApi, saveAttendanceLogApi } from './api.js';
import { getUserIdFromUrl, formatDate } from './utils.js';
import { getPeriodsData } from './timetable.js';
import { Storage } from './storage.js';
import { debounceSync } from './sync.js';
import { calculateNewStats } from './calculator.js';

let currentViewDate = new Date();
let selectedDate = new Date();
let attendanceLogsCache = [];
let fetchLogsTimeout = null;
let isFetchingLogs = false;
let pendingLogsQueue = []; // Queue for bulk sync

export function initCalendar() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');

    if (prevBtn && !prevBtn.dataset.listener) {
        prevBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            renderCalendar();
            debouncedFetchLogs();
        });
        prevBtn.dataset.listener = 'true';
    }

    if (nextBtn && !nextBtn.dataset.listener) {
        nextBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
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

    const userId = getUserIdFromUrl();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    const cachedLogs = Storage.get(userId, `logs_${year}_${month}`);
    if (cachedLogs) {
        attendanceLogsCache = cachedLogs;
    }

    renderCalendar();
    debouncedFetchLogs();
    renderDayAttendance();
}

function handleDateChange(oldMonth, oldYear) {
    const newMonth = selectedDate.getMonth();
    const newYear = selectedDate.getFullYear();
    if (oldMonth !== newMonth || oldYear !== newYear) {
        currentViewDate = new Date(newYear, newMonth, 1);
        const userId = getUserIdFromUrl();
        const cachedLogs = Storage.get(userId, `logs_${newYear}_${newMonth + 1}`);
        if (cachedLogs) attendanceLogsCache = cachedLogs;
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
    const userId = getUserIdFromUrl();
    if (!userId) return;
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    isFetchingLogs = true;
    try {
        const freshLogs = await fetchMonthlyLogsApi(userId, year, month);
        attendanceLogsCache = freshLogs;
        Storage.save(userId, `logs_${year}_${month}`, freshLogs);
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
        
        const dayLogs = attendanceLogsCache.filter(l => formatDate(l.date) === dateStr);
        if (dayLogs.length > 0) {
            const hasAbsent = dayLogs.some(l => l.status === 'absent');
            const allPresent = dayLogs.every(l => l.status === 'present' || l.status === 'cancelled');
            if (hasAbsent) dayDiv.classList.add('cal-absent');
            else if (allPresent) dayDiv.classList.add('cal-present');
        }
        
        dayDiv.onclick = () => {
            selectedDate = new Date(year, month, day);
            renderCalendar();
            renderDayAttendance();
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
    daySubjects.forEach(subject => {
        if (!subject.name) return;
        const slot = document.createElement('div');
        slot.className = 'attendance-slot';
        const log = attendanceLogsCache.find(l => formatDate(l.date) === selectedDateStr && Number(l.timetable_id) === Number(subject.timetableId));
        let status = log ? log.status : 'pending';
        if (isFetchingLogs && !log) status = 'loading';
        slot.innerHTML = `
            <div class="slot-content">
                <span class="slot-subject-name">${subject.name}</span>
                <div class="slot-status-badge status-${status}">${status}</div>
            </div>
            <div class="slot-actions-overlay">
                <button class="overlay-btn btn-present-mini" data-status="present">Present</button>
                <button class="overlay-btn btn-absent-mini" data-status="absent">Absent</button>
                <button class="overlay-btn btn-cancelled-mini" data-status="cancelled">Cancelled</button>
                <button class="overlay-btn btn-clear-mini" data-status="clear">Clear</button>
            </div>
        `;
        slot.querySelectorAll('.overlay-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                markAttendance(subject.name, btn.dataset.status, e, subject.timetableId, subject.id);
            };
        });
        slot.onclick = () => {
            const isShowing = slot.classList.contains('show-actions');
            document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
            if (!isShowing) slot.classList.add('show-actions');
        };
        slotsWrapper.appendChild(slot);
    });
    renderExtraClasses(selectedDateStr, slotsWrapper);
}

function renderExtraClasses(selectedDateStr, slotsWrapper) {
    const extraLogs = attendanceLogsCache.filter(l => formatDate(l.date) === selectedDateStr && !l.timetable_id);
    if (extraLogs.length > 0) {
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
                    <button class="overlay-btn btn-clear-mini" data-status="clear">Remove</button>
                </div>
            `;
            slot.querySelector('.overlay-btn').onclick = (e) => {
                e.stopPropagation();
                markAttendance(log.subject_name, 'clear', e, null, log.subject_id);
            };
            slotsWrapper.appendChild(slot);
        });
    }
}

export async function markAttendance(subjectName, status, event, timetableId, subjectId) {
    if (event) event.stopPropagation();
    const userId = getUserIdFromUrl();
    const dateStr = formatDate(selectedDate);
    
    // 1. Find old status for calculations
    const existingIndex = attendanceLogsCache.findIndex(l => 
        formatDate(l.date) === dateStr && 
        (timetableId ? Number(l.timetable_id) === Number(timetableId) : (Number(l.subject_id) === Number(subjectId) && !l.timetable_id))
    );
    const oldStatus = existingIndex > -1 ? attendanceLogsCache[existingIndex].status : 'pending';

    // 2. Instant local update for calendar
    if (status === 'clear') {
        if (existingIndex > -1) attendanceLogsCache.splice(existingIndex, 1);
    } else if (existingIndex > -1) {
        attendanceLogsCache[existingIndex].status = status;
    } else {
        attendanceLogsCache.push({ id: Date.now(), date: dateStr, subject_id: subjectId, timetable_id: timetableId, status, subject_name: subjectName });
    }
    
    renderCalendar();
    renderDayAttendance();

    // 3. Instant local update for dashboard stats
    if (oldStatus !== status) {
        const dashboardCache = Storage.get(userId, 'dashboard');
        if (dashboardCache) {
            const updatedDashboard = calculateNewStats(dashboardCache, subjectId, oldStatus, status);
            Storage.save(userId, 'dashboard', updatedDashboard);
            if (window.refreshDashboard) window.refreshDashboard(updatedDashboard, ['subjects', 'timetable']);
        }
    }

    // 4. Queue for bulk sync
    const logData = { date: dateStr, subjectId, timetableId, status };
    const queueIdx = pendingLogsQueue.findIndex(l => 
        l.date === dateStr && 
        (timetableId ? l.timetableId === timetableId : (l.subjectId === subjectId && !l.timetableId))
    );
    if (queueIdx > -1) pendingLogsQueue[queueIdx] = logData;
    else pendingLogsQueue.push(logData);

    debounceSync('attendance_queue', async () => {
        const logsToSync = [...pendingLogsQueue];
        pendingLogsQueue = []; 
        await saveAttendanceLogApi(userId, logsToSync);
        await fetchMonthlyLogs();
        if (window.refreshDashboard) window.refreshDashboard();
    }, 4000); 
}

export async function markWholeDay(status) {
    const userId = getUserIdFromUrl();
    const dateStr = formatDate(selectedDate);
    const daySubjects = getPeriodsData()[selectedDate.toLocaleDateString('en-US', { weekday: 'long' })] || [];
    const newLogs = daySubjects.filter(s => s.name).map(s => ({ date: dateStr, subjectId: s.id, timetableId: s.timetableId, status: status === 'holiday' ? 'cancelled' : status }));
    
    if (newLogs.length === 0) return;

    let dashboardCache = Storage.get(userId, 'dashboard');

    newLogs.forEach(newLog => {
        // Local calendar update
        const idx = attendanceLogsCache.findIndex(l => formatDate(l.date) === dateStr && Number(l.timetable_id) === Number(newLog.timetableId));
        const oldStatus = idx > -1 ? attendanceLogsCache[idx].status : 'pending';
        
        if (idx > -1) attendanceLogsCache[idx].status = newLog.status;
        else attendanceLogsCache.push({ ...newLog, timetable_id: newLog.timetableId, subject_id: newLog.subjectId });
        
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
        Storage.save(userId, 'dashboard', dashboardCache);
        if (window.refreshDashboard) window.refreshDashboard(dashboardCache, ['subjects', 'timetable']);
    }

    renderCalendar();
    renderDayAttendance();

    debounceSync('attendance_queue', async () => {
        const logsToSync = [...pendingLogsQueue];
        pendingLogsQueue = [];
        await saveAttendanceLogApi(userId, logsToSync);
        await fetchMonthlyLogs();
        if (window.refreshDashboard) window.refreshDashboard();
    }, 4000);
}

export function openExtraClassModal() {
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
}

export function closeExtraClassModal() {
    const modal = document.getElementById('extraClassModal');
    if (modal) modal.style.display = 'none';
}

export async function saveExtraClass() {
    const select = document.getElementById('extra-subject-select');
    const statusSelect = document.getElementById('extra-status-select');
    if (!select || !statusSelect) return;
    const subjectId = select.value;
    const subjectName = select.options[select.selectedIndex].text;
    const status = statusSelect.value;
    if (!subjectId) return;
    await markAttendance(subjectName, status, null, null, subjectId);
    closeExtraClassModal();
}
