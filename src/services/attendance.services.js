import { db } from "../db/db.js"
import { sql, eq, inArray } from "drizzle-orm";
import { timetable, attendanceLogs } from "../db/schema.js";
import { getUserById } from "./users.services.js";
 
// Cache stores dashboard data: { subjects, overall, timetable }
const cache = new Map();

export async function getDashboardData(userId) {
  if (cache.has(userId)) return cache.get(userId);

  const stats = await getSubjectStatsInternal(userId);
  const timetable = await getTimetableInternal(userId);
  const overall = getOverallPercentage(stats);
  const userResults = await getUserById(userId);
  const user = userResults && userResults.length > 0 ? userResults[0] : null;

  const data = { subjects: stats, overall, timetable, user };
  cache.set(userId, data);
  return data;
}

export function clearUserCache(userId) {
  cache.delete(userId);
}

async function getSubjectStatsInternal(userId) {
  const { rows } = await db.execute(sql`
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(al.id) FILTER (WHERE al.status <> 'cancelled') AS total_classes,
      COUNT(al.id) FILTER (WHERE al.status = 'present') AS attended_classes,
      COALESCE(ROUND(
        COUNT(al.id) FILTER (WHERE al.status = 'present') * 100.0 /
        NULLIF(COUNT(al.id) FILTER (WHERE al.status <> 'cancelled'), 0), 2
        ), 0) AS attendance_percentage
    FROM subjects s
    LEFT JOIN timetable t ON t.subject_id = s.id AND t.user_id = ${userId}
    LEFT JOIN attendance_logs al ON al.timetable_id = t.id AND al.user_id = ${userId}
    WHERE s.user_id = ${userId}
    GROUP BY s.id, s.name
    ORDER BY s.name;
  `);

  return rows.map(row => {
    const total = Number(row.total_classes);
    const attended = Number(row.attended_classes);
    let bunk_available = 0;
    let classes_needed = 0;
    let status_message = "";
    
    if (total > 0) {
      if (attended / total >= 0.75) {
        bunk_available = Math.floor((attended * 4/3) - total);
        status_message = `You can bunk ${bunk_available} class${bunk_available !== 1 ? 'es' : ''} and stay >= 75%.`;
      } else {
        classes_needed = (3 * total) - (4 * attended);
        status_message = `You need to attend ${classes_needed} more class${classes_needed !== 1 ? 'es' : ''} to reach 75%.`;
      }
    } else {
        status_message = "No classes held yet.";
    }

    return {
      ...row,
      bunk_available,
      classes_needed,
      status_message
    };
  });
}

async function getTimetableInternal(userId) {
  const { rows } = await db.execute(sql`
    SELECT 
      t.id as timetable_id,
      t.day_of_week,
      t.period_number,
      s.id as subject_id,
      s.name as subject_name
    FROM timetable t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.user_id = ${userId}
    ORDER BY t.day_of_week, t.period_number;
  `);
  
  const timetable = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  };
  
  rows.forEach(row => {
    const day = row.day_of_week.toLowerCase();
    const idx = row.period_number - 1;
    
    while (timetable[day].length <= idx) {
      timetable[day].push({ id: null, name: '' });
    }
    
    timetable[day][idx] = { 
      id: row.subject_id, 
      name: row.subject_name,
      timetableId: row.timetable_id 
    };
  });
  
  return timetable;
}

export function getOverallPercentage(attendanceData){
  let total = 0;
  let attended = 0;

  for(const s of attendanceData) {
    total += Number(s.total_classes);
    attended += Number(s.attended_classes);
  }

  const percentage = total === 0? 0 : Number(((attended * 100) / total).toFixed(2)); 

  return {
    total_classes: total,
    attended_classes: attended,
    percentage,
  };
}

export async function saveTimetableService(userId, timetableData) {
  clearUserCache(userId);
  const uId = parseInt(userId);

  // 1. Fetch existing slots for this user
  const existingSlots = await db.select().from(timetable).where(eq(timetable.userId, uId));
  
  // 2. Prepare incoming data from frontend
  const incomingData = [];
  for (const day in timetableData) {
    const periods = timetableData[day];
    periods.forEach((period, index) => {
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

  // 3. Delete slots that have been removed in the new timetable
  const incomingKeys = incomingData.map(d => `${d.dayOfWeek}-${d.periodNumber}`);
  const toDelete = existingSlots.filter(s => !incomingKeys.includes(`${s.dayOfWeek}-${s.periodNumber}`));
  
  if (toDelete.length > 0) {
    const toDeleteIds = toDelete.map(s => s.id);
    await db.delete(timetable).where(inArray(timetable.id, toDeleteIds));
  }

  // 4. Update existing slots or insert new ones
  // This preserves the ID for existing (day, period) slots, keeping attendance logs intact.
  for (const slot of incomingData) {
    const existing = existingSlots.find(s => s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber);
    if (existing) {
      if (existing.subjectId !== slot.subjectId) {
        await db.update(timetable)
          .set({ subjectId: slot.subjectId })
          .where(eq(timetable.id, existing.id));
      }
    } else {
      await db.insert(timetable).values(slot);
    }
  }
  
  return true;
}

export async function getMonthlyLogs(userId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { rows } = await db.execute(sql`
    SELECT 
      al.id,
      al.date,
      al.status,
      al.timetable_id,
      s.name as subject_name
    FROM attendance_logs al
    JOIN timetable t ON t.id = al.timetable_id
    JOIN subjects s ON s.id = t.subject_id
    WHERE al.user_id = ${userId}
    AND al.date >= ${startDate}
    AND al.date <= ${endDate}
    ORDER BY al.date ASC;
  `);

  return rows;
}

export async function saveAttendanceLogsService(userId, logs) {
  clearUserCache(userId);
  const uId = parseInt(userId);

  for (const log of logs) {
    const { timetable_id, date, status } = log;
    
    // Check if a log already exists for this slot and date
    const existing = await db.select().from(attendanceLogs).where(
      sql`${attendanceLogs.userId} = ${uId} AND 
          ${attendanceLogs.timetableId} = ${timetable_id} AND 
          ${attendanceLogs.date} = ${date}`
    );

    if (existing.length > 0) {
      await db.update(attendanceLogs)
        .set({ status })
        .where(eq(attendanceLogs.id, existing[0].id));
    } else {
      await db.insert(attendanceLogs).values({
        userId: uId,
        timetableId: timetable_id,
        date,
        status
      });
    }
  }
  return true;
}