async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        // Session expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/';
        throw new Error('Session expired. Please log in again.');
    }
    
    return response;
}

export async function fetchDashboardData(userId) {
    const res = await authenticatedFetch(`/${userId}/attendance`);
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch dashboard data');
    }
    return await res.json();
}

export async function saveSubjectsApi(userId, subjects) {
    const res = await authenticatedFetch(`/users/${userId}/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjects })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save subjects');
    return data;
}

export async function saveTimetableApi(userId, timetable) {
    const res = await authenticatedFetch(`/${userId}/attendance/timetable`, {
        method: 'POST',
        body: JSON.stringify({ timetable })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save timetable');
    return data;
}

export async function fetchMonthlyLogsApi(userId, year, month) {
    const res = await authenticatedFetch(`/${userId}/attendance/logs?year=${year}&month=${month}`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return await res.json();
}

export async function saveAttendanceLogApi(userId, logs) {
    const res = await authenticatedFetch(`/${userId}/attendance/logs`, {
        method: 'POST',
        body: JSON.stringify({ logs })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save attendance logs');
    return data;
}

export async function updateProfileApi(userId, name) {
    const res = await authenticatedFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    return data;
}

export async function verifyTokenApi() {
    const res = await authenticatedFetch('/users/verify');
    if (!res.ok) throw new Error('Invalid token');
    return await res.json();
}

