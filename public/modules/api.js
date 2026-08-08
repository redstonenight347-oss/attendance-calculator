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

export async function fetchDashboardData() {
    const res = await authenticatedFetch(`/attendance?_t=${Date.now()}`);
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch dashboard data');
    }
    return await res.json();
}

export async function saveSubjectsApi(subjects) {
    const res = await authenticatedFetch(`/users/me/subjects`, {
        method: 'POST',
        body: JSON.stringify({ subjects })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save subjects');
    return data;
}

export async function saveTimetableApi(timetable) {
    const res = await authenticatedFetch(`/attendance/timetable`, {
        method: 'POST',
        body: JSON.stringify({ timetable })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save timetable');
    return data;
}

export async function fetchMonthlyLogsApi(year, month) {
    const res = await authenticatedFetch(`/attendance/logs?year=${year}&month=${month}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return await res.json();
}

export async function saveAttendanceLogApi(logs) {
    const res = await authenticatedFetch(`/attendance/logs`, {
        method: 'POST',
        body: JSON.stringify({ logs })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save attendance logs');
    return data;
}

export async function updateProfileApi(updateData) {
    const res = await authenticatedFetch(`/users/me`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
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

export async function requestPasswordOTPApi() {
    const res = await authenticatedFetch(`/users/me/password/otp`, {
        method: 'POST',
        body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to request OTP');
    return data;
}

export async function changePasswordWithOTPApi(otp, newPassword) {
    const res = await authenticatedFetch(`/users/me/password`, {
        method: 'POST',
        body: JSON.stringify({ otp, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to change password');
    return data;
}
