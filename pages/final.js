import { useEffect, useState } from "react";
import { CLASSES, EXAMS, FINAL_LEADERBOARD_DATE, formatShortDate } from "../lib/campaign";
import { getSavedProfile } from "../lib/device";
import { safeFetchJson } from "../lib/safe-fetch";

export default function Final() {
  const [klass, setKlass] = useState("11");
  const [exam, setExam] = useState("JEE");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getSavedProfile();
    if (saved) {
      setKlass(saved.class);
      setExam(saved.exam);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    safeFetchJson(`/api/final-leaderboard?class=${klass}&exam=${exam}`).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [klass, exam]);

  const revealDate = formatShortDate(FINAL_LEADERBOARD_DATE);
  const rows = data?.leaderboard || [];
  const revealed = !!data?.winnerRevealed;
  const champion = revealed ? rows[0] : null;
  const rest = revealed ? rows.slice(1) : rows;

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <div className="relative text-center mb-6 sm:mb-8 animate-fade-up">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/20 blur-3xl rounded-full pointer-events-none -z-10" />
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            The <span className="text-gradient">Consistency Race</span>
          </h1>
          <p className="text-gray-400 mt-1.5 text-xs sm:text-sm px-2">
            Live standings — who's showing up every single day. Top spot revealed {revealDate}.
          </p>
          <div className="mt-4 flex justify-center">
            <a href="/" className="text-sm text-accent hover:underline">
              ← Back to today's questions
            </a>
          </div>
        </div>

        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          {CLASSES.map((c) => (
            <button
              key={c.value}
              onClick={() => setKlass(c.value)}
              className={`px-3.5 py-2.5 rounded-full text-sm border transition ${
                klass === c.value ? "border-accent bg-accent/20 shadow-glow text-white" : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="w-px bg-white/10 mx-1" />
          {EXAMS.map((ex) => (
            <button
              key={ex.value}
              onClick={() => setExam(ex.value)}
              className={`px-3.5 py-2.5 rounded-full text-sm border transition ${
                exam === ex.value ? "border-gold bg-gold/20 shadow-goldglow text-white" : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Champion / teaser slot — always at the very top */}
        <ChampionSlot revealed={revealed} champion={champion} revealDate={revealDate} />

        <div className="glass rounded-3xl p-5 sm:p-6 animate-fade-up shadow-card">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
            </div>
          )}

          {!loading && data?.error && <p className="text-center text-bad py-10 text-sm">{data.error}</p>}

          {!loading && !data?.error && rest.length === 0 && (
            <p className="text-center text-gray-500 py-10 text-sm">
              No one's on the board yet for this group. Be the first — play today.
            </p>
          )}

          {!loading && !data?.error && rest.length > 0 && (
            <>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500 px-2.5 pb-2 mb-1 border-b border-white/5">
                <span>Rank · Name</span>
                <span className="flex gap-3 sm:gap-4">
                  <span className="w-12 text-right">Days</span>
                  <span className="w-14 text-right">Correct</span>
                  <span className="w-10 text-right">Streak</span>
                </span>
              </div>
              <div className="space-y-1">
                {rest.map((r) => (
                  <div
                    key={r.player_id}
                    className={`flex items-center justify-between text-sm py-2.5 px-2.5 rounded-lg ${
                      r.rank <= 3 ? "bg-gradient-to-r from-gold/10 to-transparent" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-7 shrink-0 text-center font-bold ${r.rank <= 3 ? "text-gold" : "text-gray-500"}`}>
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                      </span>
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="flex gap-3 sm:gap-4 text-gray-400 shrink-0">
                      <span className="w-12 text-right font-medium text-white">{r.daysPlayed}</span>
                      <span className="w-14 text-right">{r.correct}/{r.answered}</span>
                      <span className="w-10 text-right text-gold">{r.longestStreak > 0 ? `🔥${r.longestStreak}` : "—"}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-4 px-1 leading-relaxed">
                Ranked by days shown up, then best streak, then total correct. Consistency wins here — not one lucky day.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChampionSlot({ revealed, champion, revealDate }) {
  if (revealed && champion) {
    return (
      <div className="relative glass rounded-3xl p-6 mb-4 text-center shadow-card overflow-hidden animate-pop border border-gold/30">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-56 h-56 bg-gold/25 blur-3xl rounded-full pointer-events-none -z-10" />
        <p className="text-xs font-semibold text-gold uppercase tracking-wide mb-1">🏆 #1 Most Consistent</p>
        <h2 className="font-display text-2xl font-extrabold">{champion.name}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {champion.daysPlayed} days · {champion.correct}/{champion.answered} correct
          {champion.longestStreak > 0 ? ` · 🔥${champion.longestStreak}` : ""}
        </p>
      </div>
    );
  }
  // Anticipation slot before the reveal.
  return (
    <div className="relative glass rounded-3xl p-6 mb-4 text-center shadow-card overflow-hidden border border-gold/20 border-dashed">
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-56 h-56 bg-gold/15 blur-3xl rounded-full pointer-events-none -z-10" />
      <div className="text-4xl mb-2 opacity-60">🏆</div>
      <p className="font-display text-lg font-bold text-gray-200">Let's see who's #1 on {revealDate}</p>
      <p className="text-sm text-gray-500 mt-1">The top spot is reserved for whoever stays most consistent till the end.</p>
    </div>
  );
}
