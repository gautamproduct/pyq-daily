// Campaign dates — IST. The challenge runs daily up to and including
// CHALLENGE_END_DATE; no new questions are served after that. This gates
// question-serving only — it's deliberately never rendered as a countdown
// or "ends on X" message in the UI.
export const CHALLENGE_END_DATE = "2026-08-16";

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
