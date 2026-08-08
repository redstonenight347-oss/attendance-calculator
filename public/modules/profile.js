import { updateProfileApi, requestPasswordOTPApi, changePasswordWithOTPApi } from './api.js';
import { getUserId, showToast } from './utils.js';

export async function saveProfile() {
    const userId = getUserId();
    const nameInput = document.getElementById('profile-name-input');

    if (!nameInput || !userId) {
        await window.customAlert("User information missing. Please reload.", "Error", "error");
        return;
    }

    const newName = nameInput.value.trim();

    if (newName === window.cachedProfileName) {
        await window.customAlert("No changes detected in your profile name.", "Info", "info");
        return;
    }

    if (!newName) {
        await window.customAlert("Name cannot be empty", "Error", "error");
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    const originalText = saveBtn.textContent;

    // OPTIMISTIC UPDATE
    const originalCache = window.latestDashboardData || null;
    if (originalCache) {
        const updatedCache = { ...originalCache };
        if (updatedCache.user) updatedCache.user.name = newName;
        window.latestDashboardData = updatedCache;
        // Instant UI update
        document.querySelectorAll('.profile-name').forEach(el => el.textContent = newName);
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        await updateProfileApi({ name: newName });
        window.cachedProfileName = newName;
        showToast("Profile updated!");
    } catch (err) {
        // Revert on error
        if (originalCache) {
            window.latestDashboardData = originalCache;
            document.querySelectorAll('.profile-name').forEach(el => el.textContent = originalCache.user.name);
        }
        await window.customAlert(err.message || "Error updating profile", "Error", "error");
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

export function openChangeEmailModal() {
    const modal = document.getElementById('changeEmailModal');
    const input = document.getElementById('new-email-input');
    if (!modal || !input) return;

    input.value = '';
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
        input.focus();
    }, 10);
}

export function closeChangeEmailModal() {
    const modal = document.getElementById('changeEmailModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

export async function confirmChangeEmail(btn) {
    const userId = getUserId();
    const input = document.getElementById('new-email-input');
    const newEmail = input.value.trim();

    if (!newEmail) {
        await window.customAlert("Email cannot be empty", "Error", "error");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        await window.customAlert("Please enter a valid email address", "Error", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating...";
    }

    try {
        await updateProfileApi({ email: newEmail });
        showToast("Email updated successfully!");

        // Update local cache and display
        const dashboardCache = window.latestDashboardData || null;
        if (dashboardCache && dashboardCache.user) {
            dashboardCache.user.email = newEmail;
            window.latestDashboardData = dashboardCache;
        }

        const emailDisplay = document.getElementById('profile-email-display');
        if (emailDisplay) emailDisplay.textContent = newEmail;

        closeChangeEmailModal();
    } catch (err) {
        await window.customAlert(err.message || "Error updating email", "Error", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Update Email";
        }
    }
}

// Bind to window for HTML access
window.openChangeEmailModal = openChangeEmailModal;
window.closeChangeEmailModal = closeChangeEmailModal;
window.confirmChangeEmail = confirmChangeEmail;
window.copyUserId = copyUserId;

export function openChangePasswordModal() {
    const emailDisplay = document.getElementById('profile-email-display');
    if (!emailDisplay || !emailDisplay.textContent || emailDisplay.textContent === 'Loading...' || !emailDisplay.textContent.includes('@')) {
        window.customAlert("Please add an email address first to use this feature.", "Error", "error");
        return;
    }

    const modal = document.getElementById('changePasswordModal');
    if (!modal) return;

    document.getElementById('password-step-1').style.display = 'block';
    document.getElementById('password-step-2').style.display = 'none';
    document.getElementById('password-otp-input').value = '';
    document.getElementById('new-password-input').value = '';

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

export function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

export async function requestPasswordOTP(btn) {
    const userId = getUserId();
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending...";
    }

    try {
        await requestPasswordOTPApi();
        document.getElementById('password-step-1').style.display = 'none';
        document.getElementById('password-step-2').style.display = 'block';
        document.getElementById('password-otp-input').focus();
    } catch (err) {
        await window.customAlert(err.message || "Failed to send OTP", "Error", "error");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Send OTP";
        }
    }
}

export async function confirmChangePassword(btn) {
    const userId = getUserId();
    const otp = document.getElementById('password-otp-input').value.trim();
    const newPassword = document.getElementById('new-password-input').value.trim();

    if (!otp || !newPassword) {
        await window.customAlert("OTP and New Password are required.", "Error", "error");
        return;
    }

    if (newPassword.length < 6) {
        await window.customAlert("Password must be at least 6 characters.", "Error", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Verifying...";
    }

    try {
        await changePasswordWithOTPApi(otp, newPassword);
        showToast("Password changed successfully!");
        closeChangePasswordModal();
    } catch (err) {
        await window.customAlert(err.message || "Failed to change password", "Error", "error");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Confirm Change";
        }
    }
}

window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.requestPasswordOTP = requestPasswordOTP;
window.confirmChangePassword = confirmChangePassword;
