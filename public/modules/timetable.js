import { saveTimetableApi } from './api.js';
import { getUserId } from './utils.js';
import { markDirty } from './sync.js';


let currentDay = 'Monday';
let availableSubjects = [];
let periodsData = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export function initTimetable(timetable) {
    if (!timetable) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    days.forEach(day => {
        const backendDay = day.toLowerCase();
        if (timetable[backendDay] && timetable[backendDay].length > 0) {
            periodsData[day] = timetable[backendDay];
        } else {
            // Default: 6 empty periods
            periodsData[day] = Array(6).fill(null).map(() => ({ id: null, name: '' }));
        }
    });

    renderPeriods();
}

export function setAvailableSubjects(subjects) {
    availableSubjects = subjects || [];
}



export function switchDay(day) {
    currentDay = day;
    const label = document.getElementById('current-day-label');
    if (label) label.textContent = day;

    document.querySelectorAll('.day-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const dayShort = day.substring(0, 3).toLowerCase();
        if (btnText === dayShort) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    renderPeriods();
}

export function addPeriod() {
    periodsData[currentDay].push({ id: null, name: '' });
    renderPeriods();
    onTimetableChange();
}

export function renderPeriods() {
    const container = document.getElementById('daily-timetable-container');
    if (!container) return;
    container.innerHTML = '';

    periodsData[currentDay].forEach((period, index) => {
        const slot = document.createElement('div');
        slot.className = 'period-slot';
        slot.dataset.index = index;

        const content = document.createElement('div');
        content.className = 'slot-content';

        if (period.name) {
            content.textContent = period.name;
            slot.dataset.id = period.id;
            slot.classList.add('filled');
        } else {
            content.textContent = `P${index + 1}`;
        }

        // Remove Period Button (The '×' button)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'slot-action-btn remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove Period';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            deletePeriod(index);
        };
        slot.appendChild(removeBtn);

        // Add Button (The '+' indicator/overlay) if empty
        if (!period.name) {
            const addBtn = document.createElement('button');
            addBtn.className = 'slot-action-btn add-btn';
            addBtn.innerHTML = '&plus;';
            addBtn.title = 'Assign Subject';
            slot.appendChild(addBtn);
        }

        slot.appendChild(content);

        // Click to toggle subject picker
        slot.onclick = () => showSubjectPicker(slot, index);



        container.appendChild(slot);
    });

    renderTimetableOverview();
}

function deletePeriod(index) {
    periodsData[currentDay].splice(index, 1);
    renderPeriods();
    onTimetableChange();
}

function showSubjectPicker(anchor, index) {
    document.body.classList.add('timetable-editing');

    // Remove any existing pickers
    const existing = document.querySelector('.subject-picker-overlay');
    if (existing) existing.remove();

    if (availableSubjects.length === 0) {
        alert('Please add subjects first in the Subjects section.');
        return;
    }

    const picker = document.createElement('div');
    picker.className = 'subject-picker-overlay';

    const list = document.createElement('div');
    list.className = 'subject-picker-list';

    const header = document.createElement('div');
    header.className = 'picker-header';
    header.textContent = 'Select Subject';
    list.appendChild(header);

    availableSubjects.forEach(s => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = s.subject_name;
        item.onclick = (e) => {
            e.stopPropagation();
            assignSubjectToPeriod(index, s.subject_id, s.subject_name);
            picker.remove();
            document.body.classList.remove('timetable-editing');
        };
        list.appendChild(item);
    });

    // Close button for mobile
    const closeBtn = document.createElement('div');
    closeBtn.className = 'picker-item close-item';
    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = () => {
        picker.remove();
        document.body.classList.remove('timetable-editing');
    };
    list.appendChild(closeBtn);

    picker.appendChild(list);
    document.body.appendChild(picker);

    // Handle click outside / close
    picker.onclick = (e) => {
        if (e.target === picker) {
            picker.remove();
            document.body.classList.remove('timetable-editing');
        }
    };
}

function assignSubjectToPeriod(index, subjectId, subjectName) {
    periodsData[currentDay][index] = {
        id: subjectId,
        name: subjectName
    };
    renderPeriods();
    onTimetableChange();
}



function onTimetableChange() {
    // Optimistic UI update for dashboard rendering (no cache persistence)
    if (window.refreshDashboard) {
        const normalizedTimetable = {};
        for (const day in periodsData) {
            normalizedTimetable[day.toLowerCase()] = JSON.parse(JSON.stringify(periodsData[day]));
        }
        window.refreshDashboard({ subjects: null, overall: null, timetable: normalizedTimetable, user: null }, ['timetable']);
    }

    markDirty('timetable');
}

export function renderTimetableOverview() {
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

export function getPeriodsData() {
    return periodsData;
}
