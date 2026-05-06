import express from 'express';
import { getAttendance, saveTimetable, getAttendanceLogs, saveAttendanceLogs } from "../controllers/attendance.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true });


router.use(authMiddleware);

router.get("/", getAttendance);
router.post("/timetable", saveTimetable);
router.get("/logs", getAttendanceLogs);
router.post("/logs", saveAttendanceLogs);


export default router;