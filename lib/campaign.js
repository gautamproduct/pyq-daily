// Campaign dates — IST. The challenge runs daily up to and including Aug 16
// (new questions stop feeding Aug 17); the winner / final champion is
// revealed Aug 17. The final leaderboard page is LIVE the whole time so
// people can watch the consistency race — only the #1 champion crown is held
// back until FINAL_LEADERBOARD_DATE.
export const CAMPAIGN_START = "2026-08-01";
export const CHALLENGE_END_DATE = "2026-08-16";
export const FINAL_LEADERBOARD_DATE = "2026-08-17";

export const CLASSES = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
];

export const EXAMS = [
  { value: "JEE", label: "JEE" },
  { value: "NEET", label: "NEET" },
];

// IST is UTC+5:30, fixed offset (no DST) — safe to hardcode.
export function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function isChallengeOpen(dateStr = todayIST()) {
  return dateStr <= CHALLENGE_END_DATE;
}

export function isFinalLeaderboardLive(dateStr = todayIST()) {
  return dateStr >= FINAL_LEADERBOARD_DATE;
}

export function msUntilIST(targetDateStr) {
  // Target = start of that day, IST.
  const target = new Date(`${targetDateStr}T00:00:00+05:30`);
  return target.getTime() - Date.now();
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-08-17" -> "Aug 17"
export function formatShortDate(dateStr) {
  const [, month, day] = dateStr.split("-").map(Number);
  return `${SHORT_MONTHS[month - 1]} ${day}`;
}
