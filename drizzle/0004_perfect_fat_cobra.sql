CREATE INDEX "idx_attendance_user" ON "attendance_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_timetable" ON "attendance_logs" USING btree ("timetable_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_status" ON "attendance_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_timetable_subject" ON "timetable" USING btree ("subject_id");