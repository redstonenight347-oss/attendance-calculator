const CACHE_KEY_PREFIX = 'attendance_calc_';

export const Storage = {
    save(userId, key, data) {
        localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}_${key}`, JSON.stringify(data));
    },

    get(userId, key) {
        const data = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}_${key}`);
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error parsing storage data', e);
            return null;
        }
    },

    clear(userId) {
        // Clear all keys for this user
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`${CACHE_KEY_PREFIX}${userId}`)) {
                localStorage.removeItem(key);
            }
        });
    }
};
