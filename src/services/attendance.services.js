import { db } from "../db/db.js"
import { sql } from "drizzle-orm";
 
const cache = new Map();

export async function getSubjectStats(userId) {
  if (cache.has(userId)) return cache.get(userId);

  const { rows } = await db.execute(sql`
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(*) FILTER (WHERE al.status <> 'cancelled') AS total_classes,
      COUNT(*) FILTER (WHERE al.status = 'present') AS attended_classes,
      ROUND(
        COUNT(*) FILTER (WHERE al.status = 'present') * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE al.status <> 'cancelled'), 0), 2
        ) AS attendance_percentage
    FROM attendance_logs al
    JOIN timetable t ON al.timetable_id = t.id
    JOIN subjects s ON t.subject_id = s.id
    WHERE al.user_id = ${userId}
    GROUP BY s.id, s.name
    ORDER BY s.name;
  `);

  const processedRows = rows.map(row => { //row is just a single object from rows array
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

  cache.set(userId, processedRows);
  return processedRows;
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