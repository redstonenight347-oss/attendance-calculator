import { pgTable, serial, integer, text, timestamp, date } from "drizzle-orm/pg-core";
import { uniqueIndex } from "drizzle-orm/pg-core";

// USERS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// SUBJECTS
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// TIMETABLE
export const timetable = pgTable(
  "timetable",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    subjectId: integer("subject_id").references(() => subjects.id),
    dayOfWeek: text("day_of_week").notNull(),
    periodNumber: integer("period_number").notNull(),
  },
  (table) => ({
    uniqueTimetable: uniqueIndex("unique_timetable").on(
      table.userId,
      table.dayOfWeek,
      table.periodNumber
    ),
  })
);

// ATTENDANCE LOGS
export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    timetableId: integer("timetable_id").references(() => timetable.id),
    date: date("date").notNull(),
    status: text("status").notNull(), // "present" | "absent"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueAttendance: uniqueIndex("unique_attendance").on(
      table.userId,
      table.timetableId,
      table.date
    ),
  })
);