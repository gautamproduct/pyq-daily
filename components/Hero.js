import { useEffect, useState } from "react";
import { CHALLENGE_END_DATE, FINAL_LEADERBOARD_DATE, formatShortDate } from "../lib/campaign";
import { safeFetchJson } from "../lib/safe-fetch";

const PI_LENS_URL = "https://play.google.com/store/apps/details?id=live.pw.pilens&hl=en_IN";

// Exactly ONE clickable thing above the fold — the "Join" button. Everything
// else near it is plain, non-link-styled text so there's no ambiguity about
// what to tap. "See who's winning" and the Pi Lens credit are real links,
// but pushed to a quiet footer row, away from the primary decision.
export default function Hero({ onStart }) {
  const endLabel = formatShortDate(CHALLENGE_END_DATE);
  const winnerLabel = formatShortDate(FINAL_LEADERBOARD_DATE);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    safeFetchJson("/api/global-stats").then((d) => {
      if (!d.error) setStats(d);
    });
  }, []);

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

      <p className="text-xs text-gray-500 mt-3">
        2 min a day · <JoinedCount stats={stats} /> · top the board by {winnerLabel}
      </p>

      <HowItWorks />
      <PageFooter />
    </div>
  );
}

function JoinedCount({ stats }) {
  const joined = stats?.totalParticipants ?? null;
  if (joined === null || joined < 5) return <span>be one of the first</span>;
  return <span>{joined} students already in</span>;
}

function HowItWorks() {
  const steps = [
    { n: "1", t: "Answer 3 daily", d: "One each from your core subjects." },
    { n: "2", t: "Build your streak", d: "7 days unlocks the True Fighter badge." },
    { n: "3", t: "Top the board", d: "Consistency wins, not luck." },
  ];
  return (
    <div className="mt-14 pt-8 border-t border-white/5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">How it works</p>
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 text-left [&::-webkit-scrollbar]:hidden">
        {steps.map((s) => (
          <div key={s.n} className="glass rounded-2xl p-3.5 shrink-0 w-[190px] snap-start sm:w-auto sm:shrink">
            <p className="text-xs font-bold text-accent mb-1.5">{s.n}</p>
            <p className="font-semibold text-sm mb-0.5">{s.t}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// The only two real links on the whole homepage, deliberately grouped and
// visually quiet so they never compete with "Attempt Today's PYQ" above.
function PageFooter() {
  return (
    <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-center gap-3 text-xs text-gray-500">
      <a href="/final" className="hover:text-gold transition">
        See who's winning →
      </a>
      <span className="text-gray-700">·</span>
      <a href={PI_LENS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition">
        Powered by PW Pi Lens App →
      </a>
    </div>
  );
}
