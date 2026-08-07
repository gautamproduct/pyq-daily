import { CHALLENGE_END_DATE, formatShortDate } from "../lib/campaign";

const PI_LENS_URL = "https://play.google.com/store/apps/details?id=live.pw.pilens&hl=en_IN";

// Cut down to the minimum: badge, headline, one line, one button. Everything
// else (how-it-works, stats, streak/badge details) was extra reading before
// the one decision that matters — dropped it; people discover streaks,
// badges, and the leaderboard naturally once they've actually started.
export default function Hero({ onStart }) {
  const endLabel = formatShortDate(CHALLENGE_END_DATE);

  return (
    <div className="relative text-center animate-pop">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/25 blur-3xl rounded-full -z-10" />

      <div className="inline-flex items-center gap-1.5 bg-panel2/80 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-400 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
        Live · ends {endLabel}
      </div>

      <h1 className="font-display text-3xl sm:text-6xl font-extrabold tracking-tight mb-3 leading-[1.1]">
        The Daily PYQ <span className="text-gradient">Challenge</span>
      </h1>

      <p className="text-gray-400 text-base sm:text-xl max-w-md mx-auto mb-8">
        3 JEE/NEET PYQs a day. Completely free.
      </p>

      <button
        onClick={onStart}
        className="btn-primary animate-glow-pulse text-white active:scale-[0.97] transition rounded-2xl px-10 py-4 font-display font-bold text-lg sm:text-xl"
      >
        Attempt Today's PYQ →
      </button>

      <div className="mt-10 pt-5 border-t border-white/5 flex items-center justify-center text-xs text-gray-500">
        <a href={PI_LENS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition">
          Powered by PW Pi Lens App →
        </a>
      </div>
    </div>
  );
}
