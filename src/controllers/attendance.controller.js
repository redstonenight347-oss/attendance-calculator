import { getSubjectStats, getOverallPercentage } from "../services/attendance.services.js";

export async function getAttendance(req, res) {
  const userID = req.params.userID;
 
  try {

    if(!userID || isNaN(userID)){
      return res.status(400).json({ message: "*proper id required"});
    }

    console.log("userID: "+userID);
    console.time("query");
    const attendanceData = await getSubjectStats(userID);
    console.timeEnd("query");

    
    if(!attendanceData || attendanceData.length === 0){
      return res.status(404).json({ message: "No data found"});
    }
    

    const overallPercentage = await getOverallPercentage(attendanceData);

    res.json({
      subjects: attendanceData, 
      overall: overallPercentage
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Couldn't collect logs"});
  }
}