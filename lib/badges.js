export const TRUE_FIGHTER_STREAK = 7;

const SEEN_KEY = "pyqdaily_badge_seen_true_fighter";

export function hasSeenTrueFighterBadge() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SEEN_KEY) === "1";
}

export function markTrueFighterBadgeSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_KEY, "1");
}
