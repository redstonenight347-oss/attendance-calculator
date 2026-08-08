import { saveSubjectsApi } from './api.js';
import { getUserId } from './utils.js';
import { markDirty } from './sync.js';

export function populateEditSubjects(subjects) {
    const list = document.getElementById('subjects-list');
    if (!list) return;

    const isFocused = list.contains(document.activeElement);

    if (isFocused) {
        const inputs = list.querySelectorAll('.subject-name-input');
        inputs.forEach(input => {
            const idAttr = input.getAttribute('data-id');
            if (!idAttr || idAttr.startsWith('temp_')) {
                const dbMatch = subjects.find(s => s.subject_name === input.value.trim());
                if (dbMatch) {
                    input.setAttribute('data-id', dbMatch.subject_id);
                }
            }
        });

        window.cachedSubjects = subjects.map(s => ({
            id: s.subject_id,
            name: s.subject_name
        }));
        return;
    }

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

export function addSubjectInput(value = '', id = '') {
    const list = document.getElementById('subjects-list');
    if (!list) return;
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
        <button type="button" class="delete-subject-btn flex items-center justify-center p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition" title="Delete Subject">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="w-4.5 h-4.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
        </button>
    `;

    div.querySelector('.delete-subject-btn').addEventListener('click', async () => {
        const inputId = div.querySelector('.subject-name-input').getAttribute('data-id');

        // If it's already saved in the DB, warn the user about cascading deletes
        if (inputId && !inputId.toString().startsWith('temp_')) {
            const subjectName = div.querySelector('.subject-name-input').value.trim() || 'this subject';
            const message = `Warning: Deleting "${subjectName}" will also permanently delete all its associated attendance logs and timetable periods from the database. Are you sure?`;

            const confirmed = await window.customConfirm(message, "Delete Subject", "warning");
            if (!confirmed) {
                return; // Revert/Abort deletion
            }
        }

        div.remove();
        updateSubjectLabels();
        onSubjectChange();
    });

    div.querySelector('.subject-name-input').addEventListener('input', () => {
        onSubjectChange();
    });

    list.appendChild(div);
}

export function updateSubjectLabels() {
    const list = document.getElementById('subjects-list');
    if (!list) return;
    Array.from(list.children).forEach((row, idx) => {
        const numberSpan = row.querySelector('.subject-number');
        if (numberSpan) {
            numberSpan.textContent = idx + 1;
        }
    });
}

export async function deleteAllSubjects() {
    if (await window.customConfirm("Warning: This will clear all subjects and permanently delete all associated attendance logs and timetable data. Are you sure?", "Clear All Subjects", "warning")) {
        const list = document.getElementById('subjects-list');
        if (list) {
            list.innerHTML = '';
            onSubjectChange();
        }
    }
}

function onSubjectChange() {
    const inputs = document.querySelectorAll('.subject-name-input');
    const subjects = [];
    inputs.forEach(input => {
        let val = input.value.trim();
        let id = input.getAttribute('data-id');
        if (val) {
            if (!id) {
                id = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                input.setAttribute('data-id', id);
            }
            subjects.push({
                id: id.startsWith('temp_') ? id : parseInt(id),
                name: val
            });
        }
    });

    // Optimistic UI update for dashboard stats (subjects list only, no cache persistence)
    if (window.refreshDashboard) {
        window.refreshDashboard({
            subjects: subjects.map(s => ({
                subject_id: s.id,
                subject_name: s.name,
                total_classes: 0,
                attended_classes: 0,
                attendance_percentage: 0
            })),
            overall: null,
            timetable: null,
            user: null
        }, ['subjects', 'timetable']);
    }

    markDirty('subjects');
}

export function getSubjectsToSave() {
    const latestInputs = document.querySelectorAll('.subject-name-input');
    const currentSubjectsToSave = [];
    latestInputs.forEach(input => {
        let val = input.value.trim();
        const id = input.getAttribute('data-id');
        if (val) {
            currentSubjectsToSave.push({
                id: (id && !id.startsWith('temp_')) ? parseInt(id) : null,
                name: val
            });
        }
    });
    return currentSubjectsToSave;
}
