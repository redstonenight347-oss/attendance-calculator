let syncTimers = {};
let activeSyncs = 0;
let syncStatusElement = null;

export const SyncStatus = {
    IDLE: 'Synced',
    SAVING: 'Saving...',
    ERROR: 'Sync Error',
    OFFLINE: 'Offline'
};

export function isSyncing() {
    return activeSyncs > 0 || Object.keys(syncTimers).some(k => syncTimers[k]);
}

function updateStatus(status, isError = false) {
    if (!syncStatusElement) {
        syncStatusElement = document.getElementById('sync-indicator');
    }
    if (!syncStatusElement) return;

    syncStatusElement.textContent = status;
    syncStatusElement.className = 'sync-indicator ' + (isError ? 'error' : '');
    
    if (status === SyncStatus.IDLE) {
        syncStatusElement.classList.add('synced');
    } else {
        syncStatusElement.classList.remove('synced');
    }
}

export function debounceSync(key, saveFn, delay = 3000) {
    if (syncTimers[key]) {
        clearTimeout(syncTimers[key]);
    }
    
    updateStatus(SyncStatus.SAVING);

    syncTimers[key] = setTimeout(async () => {
        syncTimers[key] = null; // Clear timer reference
        activeSyncs++;
        try {
            if (!navigator.onLine) {
                updateStatus(SyncStatus.OFFLINE);
                return;
            }
            await saveFn();
            updateStatus(SyncStatus.IDLE);
        } catch (err) {
            console.error(`Sync error for ${key}:`, err);
            updateStatus(SyncStatus.ERROR, true);
        } finally {
            activeSyncs--;
            if (activeSyncs === 0 && !Object.keys(syncTimers).some(k => syncTimers[k])) {
                updateStatus(SyncStatus.IDLE);
            }
        }
    }, delay);
}

window.addEventListener('online', () => updateStatus(SyncStatus.IDLE));
window.addEventListener('offline', () => updateStatus(SyncStatus.OFFLINE));
