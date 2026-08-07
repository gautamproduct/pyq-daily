import { fixedLabel } from "../lib/site-config";

const PI_LENS_URL = "https://play.google.com/store/apps/details?id=live.pw.pilens&hl=en_IN";

// Minimum: badge, headline, one line, one button. No dates/countdowns
// anywhere — "Live" is just a status word, not tied to a specific date.
export default function Hero({ onStart, fixed }) {
  return (
    <div className="relative text-center animate-pop">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/25 blur-3xl rounded-full -z-10" />

      <div className="flex items-center justify-center gap-2 flex-wrap mb-5">
        <div className="inline-flex items-center gap-1.5 bg-panel2/80 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
          Live now
        </div>
        {fixed && (
          <div className="inline-flex items-center bg-gold/10 border border-gold/25 rounded-full px-3 py-1 text-xs font-semibold text-gold">
            {fixedLabel(fixed)}
          </div>
        )}
      </div>

      <h1 className="font-display text-3xl sm:text-6xl font-extrabold tracking-tight mb-3 leading-[1.1]">
        The Daily PYQ <span className="text-gradient">Challenge</span>
      </h1>

      <p className="text-gray-400 text-base sm:text-xl max-w-md mx-auto mb-8">
        Only 3 PYQs a day.
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
