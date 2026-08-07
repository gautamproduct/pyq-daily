import { useEffect, useState } from "react";
import Countdown from "../components/Countdown";
import { CLASSES, EXAMS, FINAL_LEADERBOARD_DATE } from "../lib/campaign";
import { getSavedProfile } from "../lib/device";

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
    fetch(`/api/final-leaderboard?class=${klass}&exam=${exam}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [klass, exam]);

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8 animate-fade-up">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Final <span className="text-gold">Leaderboard</span>
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
              className={`px-3 py-1.5 rounded-full text-sm border ${
                klass === c.value ? "border-accent bg-accent/20" : "border-white/10 text-gray-400"
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
              className={`px-3 py-1.5 rounded-full text-sm border ${
                exam === ex.value ? "border-gold bg-gold/20" : "border-white/10 text-gray-400"
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="bg-panel border border-white/5 rounded-2xl p-6 animate-fade-up">
          {loading && <p className="text-center text-gray-400 py-10">Loading…</p>}

          {!loading && data?.locked && (
            <div className="text-center py-10">
              <p className="text-gray-300 mb-4">Locked until the challenge ends.</p>
              <Countdown targetDate={FINAL_LEADERBOARD_DATE} label="Reveals in" />
            </div>
          )}

          {!loading && data && !data.locked && (data.leaderboard || []).length === 0 && (
            <p className="text-center text-gray-500 py-10">No entries for this group.</p>
          )}

          {!loading && data && !data.locked && (data.leaderboard || []).length > 0 && (
            <div className="space-y-1.5">
              {data.leaderboard.map((r) => (
                <div key={r.player_id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                  <span className="flex items-center gap-2">
                    <span className={`w-6 font-bold ${r.rank <= 3 ? "text-gold" : "text-gray-500"}`}>
                      {r.rank}
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
