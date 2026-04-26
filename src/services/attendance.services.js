import { db } from "../db/db.js"
import { sql } from "drizzle-orm";
 
export async function getSubjectStats(userId) {
  return db.execute(sql`
    SELECT
  subject,
  total_classes,
  attended_classes,
  ROUND(attended_classes * 100.0 / NULLIF(total_classes, 0), 2) AS percentage
FROM (
  SELECT
    s.id,
    s.name AS subject,
    COUNT(*) FILTER (WHERE al.status != 'cancelled') AS total_classes,
    COUNT(*) FILTER (WHERE al.status = 'present') AS attended_classes
  FROM attendance_logs al
  JOIN timetable t ON al.timetable_id = t.id
  JOIN subjects s ON t.subject_id = s.id
  WHERE al.user_id = ${userId}
  GROUP BY s.id, s.name
) sub;
  `);
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