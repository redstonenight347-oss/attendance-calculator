function calculateAttendence(attendanceLogs){
  const result = {}
  const total = {}
  
  for(const log of attendanceLogs){
    for(const entry of log.entries){
      const subject = entry.subject

      if(!result[subject]){
        result[subject] = 0
        total[subject] = 0
      }

      if(entry.status !== "cancelled"){
        total[subject] += 1
      }

      if(entry.status === "present"){
        result[subject] += 1
      }
    }
  }
  
  const percentage = {}

  for(const subject in result){
    percentage[subject] = ((result[subject] / total[subject]) * 100).toFixed(2);
  }
  
  return percentage;
}

//***test entries***

// const attendanceLogs = [{
//   date: "01-04-2026",
//   entries: [{
//     subject: "dbms",
//     status: "present"  // status: "present" || "absent" || "bunk" 
//   },{
//     subject: "ds",
//     status: "present"
//   },{
//     subject: "english",
//     status: "present"
//   },{
//     subject: "coa",
//     status: "present"
//   },{
//     subject: "evs",
//     status: "present"
//   },{
//     subject: "dbmsLab",
//     status: "absent"
//   },{
//     subject: "dbmsLab",
//     status: "present"
//   },{
//     subject: "dbmsLab",
//     status: "absent"
//   }]
// }]


console.log(calculateAttendence(attendanceLogs))

module.exports = calculateAttendence(attendanceLogs)