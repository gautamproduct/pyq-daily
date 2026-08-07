import { streakMessage } from "../lib/copy";
import { TRUE_FIGHTER_STREAK } from "../lib/badges";

// Compact enough to sit beside the score ring instead of stacking under it —
// still the emotional core of the habit loop, just not at the cost of
// pushing the leaderboard/review tabs off-screen.
export default function StreakFlame({ current }) {
  if (!current || current < 1) return null;
  const unlocked = current >= TRUE_FIGHTER_STREAK;
  return (
    <div className="relative flex items-center gap-2 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent border border-gold/25 rounded-xl px-3 py-2 min-w-0 flex-1">
      <div className="text-2xl shrink-0 animate-flicker">🔥</div>
      <div className="min-w-0">
        <p className="font-display text-sm font-extrabold text-gold leading-none">
          {current} day{current === 1 ? "" : "s"}
        </p>
        <p className="text-[10px] text-gray-400 leading-tight truncate">{streakMessage(current)}</p>
      </div>
      {unlocked && (
        <span className="text-[10px] font-semibold bg-gold/15 text-gold border border-gold/30 rounded-full px-2 py-1 shrink-0">
          🏅
        </span>
      )}
    </div>
  );
}
