CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timetable" DROP CONSTRAINT "timetable_period_number_unique";--> statement-breakpoint
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_period_number_timetable_period_number_fk";
--> statement-breakpoint
ALTER TABLE "timetable" DROP CONSTRAINT "timetable_user-id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_logs" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "timetable" ADD COLUMN "subject_id" integer;--> statement-breakpoint
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_attendance" ON "attendance_logs" USING btree ("user_id","timetable_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_timetable" ON "timetable" USING btree ("user_id","day_of_week","period_number");--> statement-breakpoint
ALTER TABLE "attendance_logs" DROP COLUMN "period_number";--> statement-breakpoint
ALTER TABLE "timetable" DROP COLUMN "user-id";--> statement-breakpoint
ALTER TABLE "timetable" DROP COLUMN "subject";