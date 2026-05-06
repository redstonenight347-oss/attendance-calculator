import { saveTimetableApi } from './api.js';
import { getUserIdFromUrl } from './utils.js';
import { Storage } from './storage.js';
import { debounceSync } from './sync.js';

let draggedSubjectItem = null;
let currentDay = 'Monday';
let periodsData = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export function initTimetable(timetable) {
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
    
    renderPeriods();
}

export function populateTimetableGrid(subjects) {
    const container = document.getElementById('timetable-grid-container');
    if (!container) return;
    container.innerHTML = '';

    if (!subjects || subjects.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; color: #7f8c8d;">No subjects added yet.</p>';
        return;
    }

    subjects.forEach(s => {
        const box = document.createElement('div');
        box.className = 'draggable-subject';
        box.draggable = true;
        box.textContent = s.subject_name;
        box.dataset.id = s.subject_id;
        
        box.addEventListener('dragstart', handleDragStart);
        box.addEventListener('dragend', handleDragEnd);
        box.addEventListener('dragover', handleDragOver);
        box.addEventListener('dragenter', handleDragEnter);
        box.addEventListener('dragleave', handleDragLeave);
        box.addEventListener('drop', handleDrop);

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
    document.querySelectorAll('.draggable-subject, .period-slot').forEach(item => {
        item.classList.remove('over');
    });
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
    triggerAutoSave();
}

export function removePeriod() {
    if (periodsData[currentDay].length > 0) {
        periodsData[currentDay].pop();
        renderPeriods();
        triggerAutoSave();
    }
}

export function renderPeriods() {
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
    
    if (draggedSubjectItem && this.dataset.index !== undefined) {
        const index = parseInt(this.dataset.index);
        periodsData[currentDay][index] = {
            id: parseInt(draggedSubjectItem.dataset.id),
            name: draggedSubjectItem.textContent
        };
        renderPeriods();
        triggerAutoSave();
    }
    draggedSubjectItem = null;
    return false;
}

function triggerAutoSave() {
    const userId = getUserIdFromUrl();
    
    // DELTA CHECK
    const lastSaved = Storage.get(userId, 'timetable_last_saved');
    if (JSON.stringify(periodsData) === JSON.stringify(lastSaved)) return;

    // OPTIMISTIC UPDATE
    const dashboardCache = Storage.get(userId, 'dashboard');
    if (dashboardCache) {
        dashboardCache.timetable = JSON.parse(JSON.stringify(periodsData));
        Storage.save(userId, 'dashboard', dashboardCache);
        if (window.refreshDashboard) window.refreshDashboard(dashboardCache, ['timetable']);
    }

    debounceSync('timetable', async () => {
        await saveTimetableApi(userId, periodsData);
        Storage.save(userId, 'timetable_last_saved', periodsData);
    }, 4000);
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
