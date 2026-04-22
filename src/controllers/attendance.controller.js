import { getAttendanceLogs } from "../services/attendance.services.js";
// import { getPercentage } from "../core/attendanceCalculator.js";

export async function getAttendance(req, res) {
  const id = req.query.id;
  
  try {
    
    if(!id || id.trim() === ""){
      return res.status(400).json({ message: "*id required"});
    }

    console.log("ID: "+id);
    const attendanceData = await getAttendanceLogs(id);
    console.log(attendanceData);                                        //temp line


    if(!attendanceData || attendanceData.length === 0){
      return res.status(500).json({ message: "Couldn't collect logs"});
    }
    res.json(attendanceData[0]);

    // const percentageData = await getPercentage(attendanceData[0]);
    // console.log(percentageData);

    // res.json(percentageData);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Couldn't collect logs"});
  }
}