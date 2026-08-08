let dirtyState = {
    subjects: false,
    timetable: false,
    attendance: false
};

let syncStatusElement = null;

export const SyncStatus = {
    IDLE: 'Synced',
    UNSAVED: 'Unsaved Changes',
    SAVING: 'Saving...',
    ERROR: 'Sync Error',
    OFFLINE: 'Offline'
};

function updateStatus(status, isError = false) {
    if (!syncStatusElement) {
        syncStatusElement = document.getElementById('sync-indicator');
    }
    if (!syncStatusElement) return;

    syncStatusElement.textContent = status;
    syncStatusElement.className = 'sync-indicator ' + (isError ? 'error' : '');

    if (status === SyncStatus.IDLE) {
        syncStatusElement.classList.add('synced');
    } else if (status === SyncStatus.UNSAVED) {
        syncStatusElement.style.color = '#f59e0b';
        syncStatusElement.style.background = '#fef3c7';
        syncStatusElement.style.borderColor = '#fde68a';
    } else {
        syncStatusElement.classList.remove('synced');
        syncStatusElement.style.color = '';
        syncStatusElement.style.background = '';
        syncStatusElement.style.borderColor = '';
    }
}

export function isDirty() {
    return Object.values(dirtyState).some(isDirty => isDirty);
}

export function getDirtyKeys() {
    return Object.keys(dirtyState).filter(key => dirtyState[key]);
}

export function markDirty(key) {
    dirtyState[key] = true;
    updateStatus(SyncStatus.UNSAVED);
    updateGlobalSaveButton();
}

export function clearDirty(key) {
    if (key) {
        dirtyState[key] = false;
    } else {
        clearAllDirty();
    }
    if (!isDirty()) {
        updateStatus(SyncStatus.IDLE);
    }
    updateGlobalSaveButton();
}

export function clearAllDirty() {
    Object.keys(dirtyState).forEach(key => dirtyState[key] = false);
    updateStatus(SyncStatus.IDLE);
    updateGlobalSaveButton();
}

export function updateGlobalSaveButton() {
    const btn = document.getElementById('global-save-btn');
    if (!btn) return;

    if (isDirty()) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

export function setSyncStatus(status, isError = false) {
    updateStatus(status, isError);
}

window.addEventListener('online', () => updateStatus(isDirty() ? SyncStatus.UNSAVED : SyncStatus.IDLE));
window.addEventListener('offline', () => updateStatus(SyncStatus.OFFLINE));
