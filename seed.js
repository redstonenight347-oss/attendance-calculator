import { db } from "./src/db/db.js";
import { users, subjects, timetable, attendanceLogs } from "./src/db/schema.js";

async function seed() {
  await db.insert(users).values([
  { name: "Siddharth", email: "sid@example.com" },
  { name: "TestUser", email: "test@example.com" }
]);


await db.insert(subjects).values([
  { name: "Math" },
  { name: "Physics" },
  { name: "Chemistry" }
]);

await db.insert(timetable).values([
  // Monday
  { userId: 1, subjectId: 1, dayOfWeek: "Monday", periodNumber: 1 },
  { userId: 1, subjectId: 2, dayOfWeek: "Monday", periodNumber: 2 },

  // Tuesday
  { userId: 1, subjectId: 3, dayOfWeek: "Tuesday", periodNumber: 1 },
  { userId: 1, subjectId: 1, dayOfWeek: "Tuesday", periodNumber: 2 },

  // Wednesday
  { userId: 1, subjectId: 2, dayOfWeek: "Wednesday", periodNumber: 1 }
]);


await db.insert(attendanceLogs).values([
  // Math (timetableId = 1)
  { userId: 1, timetableId: 1, date: "2026-04-01", status: "present" },
  { userId: 1, timetableId: 1, date: "2026-04-08", status: "absent" },
  { userId: 1, timetableId: 1, date: "2026-04-15", status: "present" },

  // Physics (timetableId = 2)
  { userId: 1, timetableId: 2, date: "2026-04-01", status: "present" },
  { userId: 1, timetableId: 2, date: "2026-04-08", status: "present" },

  // Chemistry (timetableId = 3)
  { userId: 1, timetableId: 3, date: "2026-04-02", status: "absent" },
  { userId: 1, timetableId: 3, date: "2026-04-09", status: "present" }
]);


}

seed();
