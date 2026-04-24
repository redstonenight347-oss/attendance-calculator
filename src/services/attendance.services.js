import { db } from "../db/db.js";
import { attendanceLogs, subjects, timetable } from "../db/schema.js";
import { eq } from "drizzle-orm";
 
export async function getAttendanceLogs(userID) {
  console.log("GET Service hit");
  return db
    .select({
      subject: subjects.name,
      day: timetable.dayOfWeek,
      period: timetable.periodNumber,
      status: attendanceLogs.status,
      date: attendanceLogs.date,
    })
    .from(attendanceLogs)
    .innerJoin(timetable, eq(attendanceLogs.timetableId, timetable.id))
    .innerJoin(subjects, eq(timetable.subjectId, subjects.id))
    .where(eq(attendanceLogs.userId, userID));    
}