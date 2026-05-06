import { updateProfileApi } from './api.js';
import { getUserIdFromUrl, showToast } from './utils.js';
import { Storage } from './storage.js';

export async function saveProfile() {
    const userId = getUserIdFromUrl();
    const nameInput = document.getElementById('profile-name-input');
    
    if (!nameInput || !userId) {
        await window.customAlert("User information missing. Please reload.", "Error", "❌");
        return;
    }
    
    const newName = nameInput.value.trim();
    
    if (newName === window.cachedProfileName) {
        await window.customAlert("No changes detected in your profile name.", "Info", "ℹ️");
        return;
    }

    if (!newName) {
        await window.customAlert("Name cannot be empty", "Error", "❌");
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    const originalText = saveBtn.textContent;

    // OPTIMISTIC UPDATE
    const originalCache = Storage.get(userId, 'dashboard');
    if (originalCache) {
        const updatedCache = { ...originalCache };
        if (updatedCache.user) updatedCache.user.name = newName;
        Storage.save(userId, 'dashboard', updatedCache);
        // Instant UI update
        document.querySelectorAll('.profile-name').forEach(el => el.textContent = newName);
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        await updateProfileApi(userId, newName);
        window.cachedProfileName = newName;
        showToast("Profile updated!");
    } catch (err) {
        // Revert on error
        if (originalCache) {
            Storage.save(userId, 'dashboard', originalCache);
            document.querySelectorAll('.profile-name').forEach(el => el.textContent = originalCache.user.name);
        }
        await window.customAlert(err.message || "Error updating profile", "Error", "❌");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

export function copyUserId() {
    const idDisplay = document.getElementById('profile-id-display');
    if (!idDisplay) return;
    const idText = idDisplay.textContent;
    
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
