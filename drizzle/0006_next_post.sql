DROP INDEX "unique_attendance_per_day";--> statement-breakpoint
ALTER TABLE "attendance_logs" ALTER COLUMN "timetable_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD COLUMN "subject_id" integer;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendance_subject" ON "attendance_logs" USING btree ("subject_id");