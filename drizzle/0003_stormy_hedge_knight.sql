CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."day_enum" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "attendance_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"total_classes" integer DEFAULT 0 NOT NULL,
	"attended_classes" integer DEFAULT 0 NOT NULL,
	"possible_leaves" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_timetable_id_timetable_id_fk";
--> statement-breakpoint
ALTER TABLE "timetable" DROP CONSTRAINT "timetable_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "timetable" DROP CONSTRAINT "timetable_subject_id_subjects_id_fk";
--> statement-breakpoint
DROP INDEX "unique_attendance";--> statement-breakpoint
DROP INDEX "unique_timetable";--> statement-breakpoint
ALTER TABLE "attendance_logs" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_logs" ALTER COLUMN "timetable_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_logs" ALTER COLUMN "status" SET DATA TYPE "public"."attendance_status" USING "status"::"public"."attendance_status";--> statement-breakpoint
ALTER TABLE "timetable" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable" ALTER COLUMN "day_of_week" SET DATA TYPE "public"."day_enum" USING "day_of_week"::"public"."day_enum";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_summary" ADD CONSTRAINT "attendance_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_summary" ADD CONSTRAINT "attendance_summary_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_summary_per_subject" ON "attendance_summary" USING btree ("user_id","subject_id");--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_timetable_id_timetable_id_fk" FOREIGN KEY ("timetable_id") REFERENCES "public"."timetable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_attendance_per_day" ON "attendance_logs" USING btree ("user_id","timetable_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_subject_per_user" ON "subjects" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_timetable_slot" ON "timetable" USING btree ("user_id","day_of_week","period_number");