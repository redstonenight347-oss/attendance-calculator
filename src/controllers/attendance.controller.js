import { getDashboardData, saveTimetableService, getMonthlyLogs, saveAttendanceLogsService } from "../services/attendance.services.js";
import { logger } from "../utils/logger.js";

export async function getAttendance(req, res, next) {
  const userID = req.user.id; // Secure extraction from token

  try {
    const data = await getDashboardData(userID);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function saveTimetable(req, res, next) {
  const userID = req.user.id; // Secure extraction from token
  const { timetable } = req.body;

  try {
    await saveTimetableService(userID, timetable);
    logger.info("Timetable saved successfully", { userId: userID });
    res.json({ message: "Timetable saved successfully" });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceLogs(req, res, next) {
  const userID = req.user.id; // Secure extraction from token
  const { year, month } = req.query;

  try {
    if (!year || !month) {
      return res.status(400).json({ message: "Year and month are required" });
    }

    const logs = await getMonthlyLogs(userID, year, month);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

export async function saveAttendanceLogs(req, res, next) {
  const userID = req.user.id; // Secure extraction from token
  const { logs } = req.body;

  try {
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: "Logs array is required" });
    }

    await saveAttendanceLogsService(userID, logs);
    logger.info("Attendance logs saved successfully", { userId: userID, logCount: logs.length });
    res.json({ message: "Attendance logs saved successfully" });
  } catch (err) {
    next(err);
  }
}