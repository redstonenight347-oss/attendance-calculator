import express from 'express';
import { getAttendance, saveTimetable } from "../controllers/attendance.controller.js";

const router = express.Router({ mergeParams: true });


router.get("/", getAttendance);
router.post("/timetable", saveTimetable);


export default router;