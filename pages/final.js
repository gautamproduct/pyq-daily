import { useEffect, useState } from "react";
import Countdown from "../components/Countdown";
import { CLASSES, EXAMS, FINAL_LEADERBOARD_DATE } from "../lib/campaign";
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

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <div className="relative text-center mb-6 sm:mb-8 animate-fade-up">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/20 blur-3xl rounded-full pointer-events-none -z-10" />
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Final <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm px-2">PYQ Daily — who showed up, every single day.</p>
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
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
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
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                exam === ex.value ? "border-gold bg-gold/20 shadow-goldglow text-white" : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 animate-fade-up shadow-card">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
            </div>
          )}

          {!loading && data?.error && <p className="text-center text-bad py-10 text-sm">{data.error}</p>}

          {!loading && data?.locked && (
            <div className="text-center py-10">
              <p className="text-gray-300 mb-4">Locked until the challenge ends.</p>
              <Countdown targetDate={FINAL_LEADERBOARD_DATE} label="Reveals in" />
            </div>
          )}

          {!loading && data && !data.locked && !data.error && (data.leaderboard || []).length === 0 && (
            <p className="text-center text-gray-500 py-10">No entries for this group.</p>
          )}

          {!loading && data && !data.locked && (data.leaderboard || []).length > 0 && (
            <div className="space-y-1">
              {data.leaderboard.map((r) => (
                <div
                  key={r.player_id}
                  className={`flex items-center justify-between text-sm py-2.5 px-2.5 rounded-lg ${
                    r.rank <= 3 ? "bg-gradient-to-r from-gold/10 to-transparent" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-7 text-center font-bold ${r.rank <= 3 ? "text-gold" : "text-gray-500"}`}>
                      {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                    </span>
                    <span>{r.name}</span>
                  </span>
                  <span className="text-gray-400 flex gap-3">
                    <span>{r.daysPlayed}d played</span>
                    <span>{r.correct}/{r.answered} correct</span>
                    {r.longestStreak > 0 && <span className="text-gold">🔥{r.longestStreak}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
