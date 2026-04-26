import { getSubjectStats, getOverallPercentage } from "../services/attendance.services.js";

export async function getAttendance(req, res) {
  const userID = req.params.userID;
 
  try {

    if(!userID || isNaN(userID)){
      console.log("attendance")
      return res.status(400).json({ message: "*proper id required"});
    }

    console.log("userID: "+userID);
    const attendanceData = await getSubjectStats(userID);
console.log(attendanceData.rows)
    
      if(!attendanceData || attendanceData.rows.length === 0){
      return res.status(404).json({ message: "No data found"});
    }


    const overallPercentage = await getOverallPercentage(attendanceData.rows);
console.log(overallPercentage)
    res.json({
      subjects: attendanceData.rows, 
      overall: overallPercentage
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Couldn't collect logs"});
  }
}