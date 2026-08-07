import { streakMessage } from "../lib/copy";
import { TRUE_FIGHTER_STREAK } from "../lib/badges";

// The streak is the emotional core of a daily-habit product (see Duolingo) —
// it gets a hero treatment, not a small pill buried in a corner.
export default function StreakFlame({ current }) {
  if (!current || current < 1) return null;
  const unlocked = current >= TRUE_FIGHTER_STREAK;
  return (
    <div className="relative flex items-center gap-4 bg-gradient-to-r from-gold/20 via-gold/5 to-transparent border border-gold/25 shadow-goldglow rounded-2xl px-5 py-4 overflow-hidden">
      <div className="text-5xl animate-flicker">🔥</div>
      <div className="flex-1">
        <p className="font-display text-2xl font-extrabold text-gold leading-none">
          {current} day{current === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-gray-300 mt-1">{streakMessage(current)}</p>
      </div>
      {unlocked && (
        <span className="text-xs font-semibold bg-gold/15 text-gold border border-gold/30 rounded-full px-2.5 py-1.5 shrink-0">
          🏅 True Fighter
        </span>
      )}
    </div>
  );
}
