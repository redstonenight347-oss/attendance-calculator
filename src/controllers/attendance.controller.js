import { getDashboardData, saveTimetableService, getMonthlyLogs, saveAttendanceLogsService } from "../services/attendance.services.js";

export async function getAttendance(req, res) {
  const userID = req.params.userID;
 
  try {
    if(!userID || isNaN(userID)){
      return res.status(400).json({ message: "*proper id required"});
    }

    console.log("userID: "+userID);
    const data = await getDashboardData(userID);
    
    if(!data.subjects || data.subjects.length === 0){
      return res.status(404).json({ message: "No data found"});
    }
        
    res.json(data);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Couldn't collect dashboard data"});
  }
}

export async function saveTimetable(req, res) {
  const userID = req.params.userID;
  const { timetable } = req.body;
  
  try {
    if(!userID || isNaN(userID)){
      return res.status(400).json({ message: "*proper id required"});
    }
    
    await saveTimetableService(userID, timetable);
    res.json({ message: "Timetable saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to save timetable" });
  }
}

export async function getAttendanceLogs(req, res) {
  const userID = req.params.userID;
  const { year, month } = req.query;

  try {
    if (!userID || isNaN(userID)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }
    if (!year || !month) {
      return res.status(400).json({ message: "Year and month are required" });
    }

    const logs = await getMonthlyLogs(userID, year, month);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attendance logs" });
  }
}

export async function saveAttendanceLogs(req, res) {
  const userID = req.params.userID;
  const { logs } = req.body;

  try {
    if (!userID || isNaN(userID)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: "Logs array is required" });
    }

    await saveAttendanceLogsService(userID, logs);
    res.json({ message: "Attendance logs saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save attendance logs" });
  }
}