export function getOverallPercentage(logs) {
  const result = {};

  for (const log of logs) {
    const { subject, status } = log;

    // initialize subject if not exists
    if (!result[subject]) {
      result[subject] = {
        subject,
        total: 0,
        attended: 0,
      };
    }

    // increment total
    result[subject].total++;

    // increment attended
    if (status.toLowerCase() === "present") {
      result[subject].attended++;
    }
  }

  const output = [];
  // calculate percentage
  for (const subject in result) {
    const { total, attended } = result[subject];
  
    output.push({
      subject,
      total,
      attended,
      percentage: total === 0 ? 0 : Number(((attended / total) * 100).toFixed(2))});
  }

  return output;
}