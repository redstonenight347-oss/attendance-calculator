import { pgTable, serial, integer, text, timestamp, date, time} from "drizzle-orm/pg-core";

//Users

export const users = pgTable("users",{
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAT: timestamp("created_at").defaultNow(),
});

//Timetable

export const timetable = pgTable("timetable", {
  id: serial("id").primaryKey(),
  userId: integer("user-id").references (() => users.id),
  subject: text("subject").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
});

//Attendance logs

export const attendanceLogs = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  timetableID: integer("timetable_id").references(() => timetable.id),
  date: date("date").notNull(),
  createdAT: timestamp("created_at").defaultNow(),
});