export async function fetchDashboardData(userId) {
    const res = await fetch(`/${userId}/attendance`);
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch dashboard data');
    }
    return await res.json();
}

export async function saveSubjectsApi(userId, subjects) {
    const res = await fetch(`/users/${userId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save subjects');
    return data;
}

export async function saveTimetableApi(userId, timetable) {
    const res = await fetch(`/${userId}/attendance/timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetable })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save timetable');
    return data;
}

export async function fetchMonthlyLogsApi(userId, year, month) {
    const res = await fetch(`/${userId}/attendance/logs?year=${year}&month=${month}`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return await res.json();
}

export async function saveAttendanceLogApi(userId, logs) {
    const res = await fetch(`/${userId}/attendance/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save attendance logs');
    return data;
}

export async function updateProfileApi(userId, name) {
    const res = await fetch(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    return data;
}
