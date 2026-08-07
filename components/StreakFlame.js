import { streakMessage } from "../lib/copy";

// The streak is the emotional core of a daily-habit product (see Duolingo) —
// it gets a hero treatment, not a small pill buried in a corner.
export default function StreakFlame({ current }) {
  if (!current || current < 1) return null;
  return (
    <div className="flex items-center gap-4 bg-gradient-to-r from-gold/15 to-transparent border border-gold/20 rounded-2xl px-5 py-4">
      <div className="text-4xl animate-flicker">🔥</div>
      <div>
        <p className="text-2xl font-extrabold text-gold leading-none">
          {current} day{current === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-gray-400 mt-1">{streakMessage(current)}</p>
      </div>
    </div>
  );
}
