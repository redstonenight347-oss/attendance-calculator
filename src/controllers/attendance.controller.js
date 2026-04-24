import { getAttendanceLogs } from "../services/attendance.services.js";
import { getPercentage } from "../core/attendanceCalculator.js";

export async function getAttendance(req, res) {
  const userID = req.params.userID;
  
  try {

    if(!userID || isNaN(userID)){
      console.log("attendance")
      return res.status(400).json({ message: "*id required"});
    }

    console.log("userID: "+userID);
    const attendanceData = await getAttendanceLogs(userID);

    
    if(!attendanceData || attendanceData.length === 0){
      return res.status(500).json({ message: "Couldn't collect logs"});
    }
    

    const percentageData = await getPercentage(attendanceData);
    console.log(percentageData)
    res.json(percentageData);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Couldn't collect logs"});
  }
}