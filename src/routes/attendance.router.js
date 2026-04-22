import express from 'express';
import { getAttendance  } from "../controllers/attendance.controller.js";

const router = express.Router();


router.get("/", getAttendance);


export default router;