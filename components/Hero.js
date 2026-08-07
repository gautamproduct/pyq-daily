import { useEffect, useState } from "react";
import { CHALLENGE_END_DATE, FINAL_LEADERBOARD_DATE, formatShortDate } from "../lib/campaign";
import { safeFetchJson } from "../lib/safe-fetch";

const PI_LENS_URL = "https://play.google.com/store/apps/details?id=live.pw.pilens&hl=en_IN";

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
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/30 blur-3xl rounded-full -z-10" />
      <div className="absolute top-20 left-4 w-32 h-32 bg-gold/20 blur-3xl rounded-full -z-10 animate-float" />
      <div className="absolute top-32 right-4 w-32 h-32 bg-teal/20 blur-3xl rounded-full -z-10 animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="inline-flex items-center gap-1.5 bg-panel2/80 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
        Live · ends {endLabel}
      </div>

      <h1 className="font-display text-3xl sm:text-6xl font-extrabold tracking-tight mb-2 leading-[1.1]">
        The Daily PYQ <span className="text-gradient">Challenge</span>
      </h1>

      <p className="text-gray-200 text-sm sm:text-xl font-medium max-w-md mx-auto mb-5 px-2">
        3 PYQs a day. Build your streak. 🏆 Top the board by {winnerLabel}.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <StatsPills stats={stats} />
      </div>

      <button
        onClick={onStart}
        className="btn-primary animate-glow-pulse text-white active:scale-[0.97] transition rounded-2xl px-9 py-4 font-display font-bold text-base sm:text-lg"
      >
        Join the challenge →
      </button>

      <div className="mt-3">
        <a href="/final" className="text-sm text-gray-400 hover:text-gold transition">
          👀 See who's winning →
        </a>
      </div>

      <HowItWorks winnerLabel={winnerLabel} />
      <PoweredBy />
    </div>
  );
}

function HowItWorks({ winnerLabel }) {
  const steps = [
    { n: "1", t: "Answer 3 daily", d: "One each from your core subjects." },
    { n: "2", t: "Build your streak", d: "7 days unlocks the True Fighter badge." },
    { n: "3", t: "Top the board", d: "By " + winnerLabel + " — consistency wins." },
  ];
  return (
    <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 mt-8 text-left [&::-webkit-scrollbar]:hidden">
      {steps.map((s) => (
        <div
          key={s.n}
          className="glass rounded-2xl p-3.5 shrink-0 w-[190px] snap-start sm:w-auto sm:shrink"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-accent to-accent2 text-white text-xs font-bold flex items-center justify-center mb-2 shadow-glow">
            {s.n}
          </div>
          <p className="font-semibold text-sm mb-0.5">{s.t}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
        </div>
      ))}
    </div>
  );
}

function PoweredBy() {
  return (
    <div className="mt-8 pt-5 border-t border-white/5">
      <a
        href={PI_LENS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-500 hover:text-gray-300 transition"
      >
        Powered by <span className="text-gray-400 font-medium">PW Pi Lens App</span> →
      </a>
    </div>
  );
}

function StatsPills({ stats }) {
  const joined = stats?.totalParticipants ?? null;
  const onTrack = stats?.onTrack ?? 0;

  return (
    <>
      {joined === null || joined < 5 ? (
        <Pill emoji="🚀" text="Be one of the first to join" glow="accent" />
      ) : (
        <Pill emoji="🔥" text={`${joined} students in the race`} glow="accent" />
      )}
      {onTrack >= 1 && <Pill emoji="💪" text={`${onTrack} on a streak`} glow="gold" className="hidden sm:inline-flex" />}
      <Pill emoji="🏆" text="Live leaderboard" glow="teal" className="hidden sm:inline-flex" />
    </>
  );
}

function Pill({ emoji, text, glow, className = "" }) {
  const glowMap = {
    gold: "shadow-goldglow border-gold/20",
    accent: "shadow-glow border-accent/20",
    teal: "border-teal/20",
  };
  return (
    <span className={`text-xs font-medium glass rounded-full px-3.5 py-2 text-gray-200 inline-flex items-center ${glowMap[glow] || ""} ${className}`}>
      {emoji} {text}
    </span>
  );
}
