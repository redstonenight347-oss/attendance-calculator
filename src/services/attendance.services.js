import { db } from "../db/db.js";
import { attendanceLogs, timetable } from "../db/schema.js";
import { eq } from "drizzle-orm";
 
export async function getAttendanceLogs(id) {
  console.log("GET Service hit");
  return db
    .select()
    .from(attendanceLogs, timetable)
    .where(eq(attendanceLogs.userId, id))
}