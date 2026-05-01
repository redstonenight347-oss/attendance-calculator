import { getDashboardData, saveTimetableService } from "../services/attendance.services.js";

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