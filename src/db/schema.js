import { pgTable,serial,integer,text,timestamp,date,uniqueIndex,index,pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// enums
export const dayEnum = pgEnum("day_enum", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", ["present","absent","cancelled"]);

// users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// subjects
export const subjects = pgTable("subjects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSubjectPerUser: uniqueIndex("unique_subject_per_user").on(
      table.userId,
      table.name
    ),
  })
);

// timetable
export const timetable = pgTable("timetable",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    dayOfWeek: dayEnum("day_of_week").notNull(),
    periodNumber: integer("period_number").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueTimetableSlot: uniqueIndex("unique_timetable_slot").on(
      table.userId,
      table.dayOfWeek,
      table.periodNumber
    ),
    subjectIdx: index("idx_timetable_subject").on(table.subjectId),
  })
);

// attendance logs
export const attendanceLogs = pgTable("attendance_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    timetableId: integer("timetable_id").notNull().references(() => timetable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueAttendancePerDay: uniqueIndex("unique_attendance_per_day").on(
      table.userId,
      table.timetableId,
      table.date
    ),
    userIdx: index("idx_attendance_user").on(table.userId),
    timetableIdx: index("idx_attendance_timetable").on(table.timetableId),
    statusIdx: index("idx_attendance_status").on(table.status),
  })
);

// attendance summary
export const attendanceSummary = pgTable("attendance_summary",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    totalClasses: integer("total_classes").notNull().default(0),
    attendedClasses: integer("attended_classes").notNull().default(0),
    possibleLeaves: integer("possible_leaves").default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSummaryPerSubject: uniqueIndex("unique_summary_per_subject").on(
      table.userId,
      table.subjectId
    ),
  })
);