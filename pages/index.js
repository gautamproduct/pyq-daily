import { useEffect, useState } from "react";
import Countdown from "../components/Countdown";
import Countdown321 from "../components/Countdown321";
import { burstConfetti } from "../lib/confetti";
import {
  CLASSES,
  EXAMS,
  CHALLENGE_END_DATE,
  FINAL_LEADERBOARD_DATE,
  isChallengeOpen,
} from "../lib/campaign";
import { getDeviceId, getSavedProfile, saveProfile, track } from "../lib/device";

export default function Home() {
  const [stage, setStage] = useState("loading"); // loading | onboarding | countdown | quiz | results
  const [profile, setProfile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [qStart, setQStart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [challengeClosed, setChallengeClosed] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const saved = getSavedProfile();
    if (saved) {
      setProfile(saved);
      loadToday(saved);
    } else {
      setStage("onboarding");
    }
  }, []);

  useEffect(() => {
    if (stage === "onboarding") loadStats(profile);
  }, [stage]);

  async function loadStats(p) {
    const qs = p ? `?class=${p.class}&exam=${p.exam}` : "";
    try {
      const res = await fetch(`/api/stats${qs}`);
      const data = await res.json();
      setStats(data);
    } catch {
      // social proof is a nice-to-have, never block on it
    }
  }

  async function loadToday(p) {
    const device_id = getDeviceId();
    const res = await fetch(
      `/api/today?class=${p.class}&exam=${p.exam}&device_id=${device_id}`
    );
    const data = await res.json();

    if (data.challengeClosed) {
      setChallengeClosed(true);
      setStage("results");
      return;
    }

    if (data.completed) {
      setStage("results");
      loadLeaderboard(p);
      loadChapters();
      return;
    }

    setQuestions(data.questions || []);
    setStage("countdown");
  }

  function handleCountdownDone() {
    const now = Date.now();
    const starts = {};
    questions.forEach((q) => (starts[q.id] = now));
    setQStart(starts);
    setStage("quiz");
    track("quiz_started", { class: profile.class, exam: profile.exam });
  }

  async function handleOnboard(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const name = String(form.get("name") || "").trim();
    const klass = form.get("class");
    const exam = form.get("exam");
    if (!name || !klass || !exam) return;

    const device_id = getDeviceId();
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id, name, class: klass, exam }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    const p = { name, class: klass, exam };
    saveProfile(p);
    setProfile(p);
    track("registered", p);
    loadToday(p);
  }

  function selectOption(questionId, option) {
    setAnswers((a) => ({ ...a, [questionId]: option }));
  }

  async function handleSubmitQuiz() {
    if (Object.keys(answers).length < questions.length) {
      alert("Answer all 3 questions first");
      return;
    }
    setSubmitting(true);
    const device_id = getDeviceId();
    const now = Date.now();
    const payload = {
      device_id,
      class: profile.class,
      exam: profile.exam,
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id],
        time_taken_ms: now - (qStart[q.id] || now),
      })),
    };
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      alert(data.error);
      return;
    }
    setResults(data);
    setStage("results");
    track("quiz_completed", { score: data.score, total: data.total });
    if (data.score === data.total) setTimeout(burstConfetti, 200);
    loadLeaderboard(profile);
    loadChapters();
    loadStats(profile);
  }

  async function loadLeaderboard(p) {
    const res = await fetch(`/api/leaderboard?class=${p.class}&exam=${p.exam}`);
    const data = await res.json();
    setLeaderboard(data.leaderboard || []);
  }

  async function loadChapters() {
    const device_id = getDeviceId();
    const res = await fetch(`/api/chapters?device_id=${device_id}`);
    const data = await res.json();
    setChapters(data.chapters || []);
  }

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        <Header />

        {stage === "loading" && <Loading />}

        {stage === "onboarding" && <Onboarding onSubmit={handleOnboard} stats={stats} />}

        {stage === "countdown" && <Countdown321 onDone={handleCountdownDone} />}

        {stage === "quiz" && (
          <Quiz
            questions={questions}
            answers={answers}
            onSelect={selectOption}
            onSubmit={handleSubmitQuiz}
            submitting={submitting}
          />
        )}

        {stage === "results" && (
          <Results
            challengeClosed={challengeClosed}
            results={results}
            leaderboard={leaderboard}
            chapters={chapters}
            profile={profile}
            stats={stats}
          />
        )}

        <div className="text-center mt-8">
          <a href="/final" className="text-xs text-gray-500 hover:text-accent">
            View final leaderboard →
          </a>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const open = isChallengeOpen();
  return (
    <div className="text-center mb-6 sm:mb-8 animate-fade-up">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
        PYQ <span className="text-gold">Daily</span>
      </h1>
      <p className="text-gray-400 mt-1 text-xs sm:text-sm px-2">
        3 previous-year questions a day. Show up daily. Build the streak.
      </p>
      <div className="mt-4 flex justify-center px-2">
        {open ? (
          <Countdown targetDate={FINAL_LEADERBOARD_DATE} label="Challenge ends Aug 15 · Final leaderboard in" />
        ) : (
          <span className="text-sm text-gray-400">
            Challenge closed. Final leaderboard reveals {FINAL_LEADERBOARD_DATE}.
          </span>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="text-center text-gray-400 py-20">Loading…</div>;
}

function LiveStats({ stats }) {
  if (!stats || stats.playersToday == null) return null;
  if (stats.playersToday < 3) {
    return (
      <p className="text-center text-xs text-gray-500 mb-4">
        Be one of the first to play today 🚀
      </p>
    );
  }
  return (
    <p className="text-center text-xs text-gray-400 mb-4">
      <span className="text-good font-semibold">{stats.playersToday}</span> students already played today
    </p>
  );
}

function Onboarding({ onSubmit, stats }) {
  return (
    <div>
      <LiveStats stats={stats} />
      <form
        onSubmit={onSubmit}
        className="bg-panel border border-white/5 rounded-2xl p-5 sm:p-6 md:p-8 animate-pop"
      >
        <label className="block text-sm text-gray-400 mb-1.5">Your name</label>
        <input
          name="name"
          required
          maxLength={60}
          placeholder="e.g. Rahul"
          className="w-full bg-panel2 border border-white/10 rounded-lg px-4 py-3 mb-5 outline-none focus:border-accent text-base"
        />

        <label className="block text-sm text-gray-400 mb-1.5">Class</label>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {CLASSES.map((c) => (
            <label key={c.value} className="cursor-pointer">
              <input type="radio" name="class" value={c.value} required className="peer sr-only" />
              <div className="text-center py-3 px-1 rounded-lg border border-white/10 bg-panel2 peer-checked:border-accent peer-checked:bg-accent/20 peer-checked:text-white text-gray-300 transition text-sm sm:text-base">
                {c.label}
              </div>
            </label>
          ))}
        </div>

        <label className="block text-sm text-gray-400 mb-1.5">Exam</label>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {EXAMS.map((ex) => (
            <label key={ex.value} className="cursor-pointer">
              <input type="radio" name="exam" value={ex.value} required className="peer sr-only" />
              <div className="text-center py-3 rounded-lg border border-white/10 bg-panel2 peer-checked:border-accent peer-checked:bg-accent/20 peer-checked:text-white text-gray-300 transition">
                {ex.label}
              </div>
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-accent hover:bg-accent/90 active:scale-[0.98] transition rounded-lg py-3.5 font-semibold text-base"
        >
          Start today's 3 questions
        </button>
      </form>
    </div>
  );
}

function Quiz({ questions, answers, onSelect, onSubmit, submitting }) {
  if (questions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16 bg-panel rounded-2xl border border-white/5">
        No questions loaded yet for your group — check back once the question bank is live.
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="bg-panel border border-white/5 rounded-2xl p-4 sm:p-5 md:p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-accent bg-accent/15 rounded-full px-2.5 py-1">
              Q{i + 1} of {questions.length}
            </span>
            {q.year && (
              <span className="text-xs font-semibold text-gold bg-gold/10 rounded-full px-2.5 py-1">
                {q.year}
              </span>
            )}
          </div>
          {q.chapter && <p className="text-xs text-gray-500 mb-2">{q.subject ? `${q.subject} · ` : ""}{q.chapter}</p>}
          <p className="text-base md:text-lg font-medium mb-4 leading-relaxed">{q.question}</p>
          <div className="grid gap-2">
            {["A", "B", "C", "D"].map((opt) => {
              const text = q[`option_${opt.toLowerCase()}`];
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => onSelect(q.id, opt)}
                  className={`text-left px-4 py-3 rounded-lg border transition active:scale-[0.98] ${
                    selected
                      ? "border-accent bg-accent/20 text-white scale-[1.01]"
                      : "border-white/10 bg-panel2 text-gray-300 hover:border-white/20"
                  }`}
                >
                  <span className="text-gray-500 mr-2">{opt}.</span>
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-accent hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50 transition rounded-lg py-3.5 font-semibold text-base sticky bottom-3"
      >
        {submitting ? "Submitting…" : "Submit answers"}
      </button>
    </div>
  );
}

function shareText(results, profile) {
  const streakLine = results?.streak?.current_streak > 1
    ? ` Day ${results.streak.current_streak} streak 🔥.`
    : "";
  return `I scored ${results.score}/${results.total} on today's PYQ Daily (${profile?.class} · ${profile?.exam}).${streakLine} Beat me 👉`;
}

function ScoreBadge({ score, total }) {
  if (score === total) return <span className="text-xs bg-gold/15 text-gold rounded-full px-2.5 py-1 font-semibold">🎯 Perfect score</span>;
  if (score === 0) return <span className="text-xs bg-white/5 text-gray-400 rounded-full px-2.5 py-1 font-semibold">Tough one — try again tomorrow</span>;
  return null;
}

function Results({ challengeClosed, results, leaderboard, chapters, profile, stats }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setSiteUrl(window.location.origin);
  }, []);

  function handleShare() {
    const text = `${shareText(results, profile)} ${siteUrl}`;
    track("share_clicked", { score: results?.score });
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-up">
      {challengeClosed && (
        <div className="bg-panel border border-white/5 rounded-2xl p-6 text-center">
          <p className="text-lg font-semibold mb-1">The daily challenge has ended.</p>
          <p className="text-gray-400 text-sm">
            Final leaderboard reveals on <span className="text-gold font-semibold">{FINAL_LEADERBOARD_DATE}</span>.
          </p>
        </div>
      )}

      {results && (
        <div className="bg-panel border border-white/5 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h2 className="text-xl font-bold">
              You scored {results.score}/{results.total}
            </h2>
            {results.streak && (
              <span className="text-sm font-semibold text-gold bg-gold/10 rounded-full px-3 py-1">
                🔥 {results.streak.current_streak} day streak
              </span>
            )}
          </div>
          <div className="mb-4">
            <ScoreBadge score={results.score} total={results.total} />
          </div>

          {results.streak?.current_streak > 0 && (
            <p className="text-xs text-gray-500 mb-4 bg-panel2 rounded-lg px-3 py-2">
              {results.streak.current_streak >= 2
                ? `Don't break it — come back tomorrow to make it ${results.streak.current_streak + 1} 🔥`
                : "Come back tomorrow to start a streak 🔥"}
            </p>
          )}

          <button
            onClick={handleShare}
            className="w-full mb-5 bg-good/15 hover:bg-good/25 text-good border border-good/30 transition rounded-lg py-2.5 font-semibold text-sm active:scale-[0.98]"
          >
            Share your score →
          </button>

          <div className="space-y-4">
            {results.results.map((r, i) => (
              <div key={r.question_id} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
                <p className="text-sm text-gray-400 mb-1">
                  Q{i + 1} {r.chapter ? `· ${r.chapter}` : ""} {r.year ? `· ${r.year}` : ""}
                </p>
                <p className="mb-2">{r.question}</p>
                <p className={`text-sm font-semibold ${r.is_correct ? "text-good" : "text-bad"}`}>
                  {r.is_correct ? "Correct" : `Incorrect — your answer: ${r.selected_option || "—"}`} · Correct answer: {r.correct_option}
                </p>
                {r.solution && <p className="text-sm text-gray-400 mt-1.5">{r.solution}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-panel border border-white/5 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-1">
          <h2 className="text-lg font-bold">Today's leaderboard — {profile?.class} · {profile?.exam}</h2>
          {stats?.playersToday > 0 && (
            <span className="text-xs text-gray-500">{stats.playersToday} played today</span>
          )}
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm">No entries yet today.</p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.slice(0, 20).map((r) => (
              <div key={r.player_id} className="flex items-center justify-between text-sm py-1.5">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-500 w-5 shrink-0">{r.rank}</span>
                  <span className="truncate">{r.name}</span>
                  {r.streak > 1 && <span className="text-gold text-xs shrink-0">🔥{r.streak}</span>}
                </span>
                <span className="text-gray-400 shrink-0">{r.correct}/{r.answered}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="bg-panel border border-white/5 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold mb-1">Chapters covered so far</h2>
          <p className="text-xs text-gray-500 mb-4">Consistency over time — {chapters.length} chapters touched</p>
          <div className="flex flex-wrap gap-2">
            {chapters.map((c) => (
              <span
                key={`${c.subject}-${c.chapter}`}
                className="text-xs bg-panel2 border border-white/10 rounded-full px-3 py-1.5 text-gray-300"
              >
                {c.chapter} <span className="text-gray-500">({c.correct}/{c.attempted})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-500 px-2">
        Come back tomorrow to keep your streak alive. Challenge runs through {CHALLENGE_END_DATE}.
      </p>
    </div>
  );
}
