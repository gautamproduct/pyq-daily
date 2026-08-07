import { useEffect, useState } from "react";
import { CHALLENGE_END_DATE, FINAL_LEADERBOARD_DATE, formatShortDate } from "../lib/campaign";
import { safeFetchJson } from "../lib/safe-fetch";

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

      <div className="inline-flex items-center gap-1.5 bg-panel2/80 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
        Live challenge · ends {endLabel}
      </div>

      <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight mb-2 leading-[1.05]">
        The PYQ Daily <span className="text-gradient">Challenge</span>
      </h1>

      <p className="text-gray-200 text-base sm:text-xl font-medium max-w-md mx-auto mb-3">
        3 previous-year JEE/NEET questions, every day. Show up, build a streak, climb the board.
      </p>
      <p className="text-gold text-sm sm:text-base font-semibold mb-7">
        🏆 Most consistent student tops the leaderboard on {winnerLabel}.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-7">
        <StatsPills stats={stats} />
      </div>

      <button
        onClick={onStart}
        className="btn-primary animate-glow-pulse text-white active:scale-[0.97] transition rounded-2xl px-9 py-4 font-display font-bold text-lg"
      >
        Join the challenge →
      </button>

      <div className="mt-4">
        <a href="/final" className="text-sm text-gray-400 hover:text-gold transition">
          👀 See who's winning →
        </a>
      </div>

      <HowItWorks winnerLabel={winnerLabel} />
    </div>
  );
}

function HowItWorks({ winnerLabel }) {
  const steps = [
    { n: "1", t: "Answer 3 daily", d: "One each from your core subjects. Takes 2 minutes." },
    { n: "2", t: "Build your streak", d: "Come back every day. 7 days unlocks the True Fighter badge." },
    { n: "3", t: "Top the board by " + winnerLabel, d: "Most consistent tops the leaderboard. No luck, just discipline." },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-10 text-left">
      {steps.map((s) => (
        <div key={s.n} className="glass rounded-2xl p-4">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-accent to-accent2 text-white text-sm font-bold flex items-center justify-center mb-2 shadow-glow">
            {s.n}
          </div>
          <p className="font-semibold text-sm mb-0.5">{s.t}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
        </div>
      ))}
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
      {onTrack >= 1 && <Pill emoji="💪" text={`${onTrack} on a streak right now`} glow="gold" />}
      <Pill emoji="🏆" text="Live leaderboard" glow="teal" />
    </>
  );
}

function Pill({ emoji, text, glow }) {
  const glowMap = {
    gold: "shadow-goldglow border-gold/20",
    accent: "shadow-glow border-accent/20",
    teal: "border-teal/20",
  };
  return (
    <span className={`text-xs font-medium glass rounded-full px-3.5 py-2 text-gray-200 ${glowMap[glow] || ""}`}>
      {emoji} {text}
    </span>
  );
}
