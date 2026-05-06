import { db } from "../db/db.js"
import { sql, eq, inArray } from "drizzle-orm";
import { timetable, attendanceLogs } from "../db/schema.js";
import { getUserById } from "./users.services.js";
 
const cache = new Map();

export async function getDashboardData(userId) {
  if (cache.has(userId)) return cache.get(userId);

  const [stats, tt, userResults] = await Promise.all([
    getSubjectStatsInternal(userId),
    getTimetableInternal(userId),
    getUserById(userId)
  ]);

  const user = userResults?.[0] || null;
  const overall = calculateOverall(stats);

  const data = { subjects: stats, overall, timetable: tt, user };
  cache.set(userId, data);
  return data;
}

export function clearUserCache(userId) {
  cache.delete(String(userId));
}

function calculateOverall(subjects) {
  let total = 0;
  let attended = 0;

  for (const s of subjects) {
    total += Number(s.total_classes);
    attended += Number(s.attended_classes);
  }

  return {
    total_classes: total,
    attended_classes: attended,
    percentage: total === 0 ? 0 : Number(((attended * 100) / total).toFixed(2)),
  };
}

async function getSubjectStatsInternal(userId) {
  const { rows } = await db.execute(sql`
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(al.id) FILTER (WHERE al.status <> 'cancelled') AS total_classes,
      COUNT(al.id) FILTER (WHERE al.status = 'present') AS attended_classes
    FROM subjects s
    LEFT JOIN (
      SELECT al.id, al.status, COALESCE(al.subject_id, t.subject_id) as derived_subject_id
      FROM attendance_logs al
      LEFT JOIN timetable t ON t.id = al.timetable_id
      WHERE al.user_id = ${userId}
    ) al ON al.derived_subject_id = s.id
    WHERE s.user_id = ${userId}
    GROUP BY s.id, s.name
    ORDER BY s.name;
  `);

  return rows.map(row => {
    const total = Number(row.total_classes);
    const attended = Number(row.attended_classes);
    const percentage = total === 0 ? 0 : Number(((attended * 100) / total).toFixed(2));
    
    let status_message = "No classes held yet.";
    let classes_needed = 0;
    let bunk_available = 0;

    if (total > 0) {
      if (percentage >= 75) {
        bunk_available = Math.floor((attended / 0.75) - total);
        status_message = `You can bunk ${bunk_available} class${bunk_available !== 1 ? 'es' : ''} and stay >= 75%.`;
      } else {
        classes_needed = Math.ceil((0.75 * total - attended) / 0.25);
        status_message = `You need to attend ${classes_needed} more class${classes_needed !== 1 ? 'es' : ''} to reach 75%.`;
      }
    }

    return {
      ...row,
      attendance_percentage: percentage,
      bunk_available,
      classes_needed,
      status_message
    };
  });
}

async function getTimetableInternal(userId) {
  const { rows } = await db.execute(sql`
    SELECT t.id as timetable_id, t.day_of_week, t.period_number, s.id as subject_id, s.name as subject_name
    FROM timetable t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.user_id = ${userId}
    ORDER BY t.day_of_week, t.period_number;
  `);
  
  const tt = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  
  rows.forEach(row => {
    const day = row.day_of_week.toLowerCase();
    const idx = row.period_number - 1;
    while (tt[day].length <= idx) tt[day].push({ id: null, name: '' });
    tt[day][idx] = { id: row.subject_id, name: row.subject_name, timetableId: row.timetable_id };
  });
  
  return tt;
}

export async function saveTimetableService(userId, timetableData) {
  clearUserCache(userId);
  const uId = parseInt(userId);

  const existingSlots = await db.select().from(timetable).where(eq(timetable.userId, uId));
  const incomingData = [];

  for (const day in timetableData) {
    timetableData[day].forEach((period, index) => {
      if (period.id) {
        incomingData.push({
          userId: uId,
          subjectId: parseInt(period.id),
          dayOfWeek: day.toLowerCase(),
          periodNumber: index + 1
        });
      }
    });
  }

  const incomingKeys = incomingData.map(d => `${d.dayOfWeek}-${d.periodNumber}`);
  const toDeleteIds = existingSlots
    .filter(s => !incomingKeys.includes(`${s.dayOfWeek}-${s.periodNumber}`))
    .map(s => s.id);
  
  if (toDeleteIds.length > 0) {
    await db.delete(timetable).where(inArray(timetable.id, toDeleteIds));
  }

  for (const slot of incomingData) {
    const existing = existingSlots.find(s => s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber);
    if (existing) {
      if (existing.subjectId !== slot.subjectId) {
        await db.update(timetable).set({ subjectId: slot.subjectId }).where(eq(timetable.id, existing.id));
      }
    } else {
      await db.insert(timetable).values(slot);
    }
  }
}

export async function getMonthlyLogs(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { rows } = await db.execute(sql`
    SELECT al.id, al.date, al.status, al.timetable_id, al.subject_id, COALESCE(s.name, s2.name) as subject_name
    FROM attendance_logs al
    LEFT JOIN timetable t ON t.id = al.timetable_id
    LEFT JOIN subjects s ON s.id = t.subject_id
    LEFT JOIN subjects s2 ON s2.id = al.subject_id
    WHERE al.user_id = ${userId} AND al.date >= ${startDate} AND al.date <= ${endDate}
    ORDER BY al.date ASC;
  `);

  return rows;
}

export async function saveAttendanceLogsService(userId, logs) {
  clearUserCache(userId);
  const uId = parseInt(userId);

  for (const log of logs) {
    const { timetableId, subjectId, date, status } = log;
    
    if (status === 'clear') {
      const condition = timetableId 
        ? sql`${attendanceLogs.userId} = ${uId} AND ${attendanceLogs.timetableId} = ${timetableId} AND ${attendanceLogs.date} = ${date}`
        : sql`${attendanceLogs.userId} = ${uId} AND ${attendanceLogs.subjectId} = ${subjectId} AND ${attendanceLogs.timetableId} IS NULL AND ${attendanceLogs.date} = ${date}`;
      await db.delete(attendanceLogs).where(condition);
      continue;
    }

    const existing = await db.select().from(attendanceLogs).where(
      timetableId 
        ? sql`${attendanceLogs.userId} = ${uId} AND ${attendanceLogs.timetableId} = ${timetableId} AND ${attendanceLogs.date} = ${date}`
        : sql`${attendanceLogs.userId} = ${uId} AND ${attendanceLogs.subjectId} = ${subjectId} AND ${attendanceLogs.timetableId} IS NULL AND ${attendanceLogs.date} = ${date}`
    );

    if (existing?.[0]) {
      await db.update(attendanceLogs).set({ status }).where(eq(attendanceLogs.id, existing[0].id));
    } else {
      await db.insert(attendanceLogs).values({ userId: uId, timetableId: timetableId || null, subjectId: subjectId, date, status });
    }
  }
}