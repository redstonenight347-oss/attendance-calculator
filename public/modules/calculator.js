import { Storage } from './storage.js';

export function calculateNewStats(dashboard, subjectId, oldStatus, newStatus) {
    if (!dashboard || !dashboard.subjects) return dashboard;

    const subject = dashboard.subjects.find(s => Number(s.subject_id) === Number(subjectId));
    if (!subject) return dashboard;

    // Helper to check if a status counts as a class attempt
    const isCounted = (status) => status === 'present' || status === 'absent';
    
    // 1. Remove effects of old status
    if (oldStatus === 'present') {
        subject.total_classes--;
        subject.attended_classes--;
    } else if (oldStatus === 'absent') {
        subject.total_classes--;
    }

    // 2. Add effects of new status
    if (newStatus === 'present') {
        subject.total_classes++;
        subject.attended_classes++;
    } else if (newStatus === 'absent') {
        subject.total_classes++;
    }

    // 3. Recalculate subject percentage
    subject.attendance_percentage = subject.total_classes > 0 
        ? Math.round((subject.attended_classes / subject.total_classes) * 100) 
        : 0;

    // 4. Recalculate Overall Stats
    let totalClasses = 0;
    let attendedClasses = 0;

    dashboard.subjects.forEach(s => {
        totalClasses += s.total_classes;
        attendedClasses += s.attended_classes;
    });

    dashboard.overall = {
        total_classes: totalClasses,
        attended_classes: attendedClasses,
        percentage: totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0
    };

    // 5. Predictor Message Update (Simplified)
    // For now we'll keep the old message or clear it to avoid complex logic here
    // The server will provide the real predictor on the next sync
    if (subject.attendance_percentage >= 75) {
        subject.status_message = "On track!";
        subject.classes_needed = 0;
    } else {
        const needed = Math.ceil((0.75 * subject.total_classes - subject.attended_classes) / 0.25);
        subject.status_message = `Need to attend ${needed} more classes`;
        subject.classes_needed = needed;
    }

    return dashboard;
}
