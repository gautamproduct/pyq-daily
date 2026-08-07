import { useEffect, useState } from "react";
import Countdown from "../components/Countdown";
import Countdown321 from "../components/Countdown321";
import Hero from "../components/Hero";
import OnboardingWizard from "../components/OnboardingWizard";
import QuizFlow from "../components/QuizFlow";
import ScoreReveal from "../components/ScoreReveal";
import StreakFlame from "../components/StreakFlame";
import Tabs from "../components/Tabs";
import ErrorBanner from "../components/ErrorBanner";
import { burstConfetti } from "../lib/confetti";
import { CHALLENGE_END_DATE, FINAL_LEADERBOARD_DATE, isChallengeOpen, formatShortDate } from "../lib/campaign";
import { getDeviceId, getSavedProfile, saveProfile, track } from "../lib/device";
import { safeFetchJson } from "../lib/safe-fetch";

export default function Home() {
  const [stage, setStage] = useState("loading"); // loading | hero | onboarding | countdown | quiz | reveal
  const [profile, setProfile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);
  const [streak, setStreak] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [challengeClosed, setChallengeClosed] = useState(false);
  const [stats, setStats] = useState(null);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    track("page_view");
    const saved = getSavedProfile();
    if (saved) {
      setProfile(saved);
      loadToday(saved);
    } else {
      setStage("hero");
    }
  }, []);

  useEffect(() => {
    if (stage === "onboarding") loadStats(profile);
  }, [stage]);

  async function loadStats(p) {
    const qs = p ? `?class=${p.class}&exam=${p.exam}` : "";
    const data = await safeFetchJson(`/api/stats${qs}`);
    if (!data.error) setStats(data);
  }

  async function loadToday(p) {
    const device_id = getDeviceId();
    const data = await safeFetchJson(`/api/today?class=${p.class}&exam=${p.exam}&device_id=${device_id}`);
    if (data.error) {
      setError(data.error);
      setStage("hero");
      return;
    }

    if (data.challengeClosed) {
      setChallengeClosed(true);
      setStage("reveal");
      return;
    }

    if (data.completed) {
      setResults(data.results);
      setStreak(data.streak);
      setStage("reveal");
      loadLeaderboard(p);
      loadChapters();
      loadStats(p);
      return;
    }

    setQuestions(data.questions || []);
    setStage("countdown");
  }

  async function handleOnboard({ name, class: klass, exam }) {
    setOnboardSubmitting(true);
    setError(null);
    const device_id = getDeviceId();
    const data = await safeFetchJson("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id, name, class: klass, exam }),
    });
    setOnboardSubmitting(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    const p = { name, class: klass, exam };
    saveProfile(p);
    setProfile(p);
    track("registered", p);
    loadToday(p);
  }

  async function handleAnswer(question_id, selected_option, time_taken_ms) {
    const device_id = getDeviceId();
    const data = await safeFetchJson("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id,
        class: profile.class,
        exam: profile.exam,
        question_id,
        selected_option,
        time_taken_ms,
      }),
    });
    if (data.error) {
      setError(data.error);
      return null;
    }
    return data;
  }

  function handleAllDone(final) {
    setResults(final.results);
    setStreak(final.streak);
    setStage("reveal");
    track("quiz_completed", { score: final.score, total: final.total });
    if (final.score === final.total) setTimeout(burstConfetti, 200);
    loadLeaderboard(profile);
    loadChapters();
    loadStats(profile);
  }

  async function loadLeaderboard(p) {
    const data = await safeFetchJson(`/api/leaderboard?class=${p.class}&exam=${p.exam}`);
    if (!data.error) setLeaderboard(data.leaderboard || []);
  }

  async function loadChapters() {
    const device_id = getDeviceId();
    const data = await safeFetchJson(`/api/chapters?device_id=${device_id}`);
    if (!data.error) setChapters(data.chapters || []);
  }

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        {stage !== "hero" && <Header compact={stage === "quiz"} />}

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {stage === "loading" && <Loading />}

        {stage === "hero" && <Hero onStart={() => setStage("onboarding")} />}

        {stage === "onboarding" && (
          <OnboardingWizard onComplete={handleOnboard} submitting={onboardSubmitting} stats={stats} />
        )}

        {stage === "countdown" && <Countdown321 onDone={() => setStage("quiz")} />}

        {stage === "quiz" && (
          <QuizFlow questions={questions} onAnswer={handleAnswer} onAllDone={handleAllDone} />
        )}

        {stage === "reveal" && (
          <Reveal
            challengeClosed={challengeClosed}
            results={results}
            streak={streak}
            leaderboard={leaderboard}
            chapters={chapters}
            profile={profile}
            stats={stats}
          />
        )}

        {stage !== "hero" && (
          <div className="text-center mt-8">
            <a href="/final" className="text-xs text-gray-500 hover:text-gold transition">
              View final leaderboard →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ compact }) {
  const open = isChallengeOpen();
  return (
    <div className={`text-center animate-fade-up ${compact ? "mb-4" : "mb-6 sm:mb-8"}`}>
      <h1 className={`font-display font-extrabold tracking-tight ${compact ? "text-xl" : "text-2xl sm:text-3xl md:text-4xl"}`}>
        PYQ <span className="text-gradient">Daily</span>
      </h1>
      {!compact && (
        <>
          <p className="text-gray-400 mt-1 text-xs sm:text-sm px-2">
            3 previous-year questions a day. Show up daily. Build the streak.
          </p>
          <div className="mt-4 flex justify-center px-2">
            {open ? (
              <Countdown
                targetDate={FINAL_LEADERBOARD_DATE}
                label={`Challenge ends ${formatShortDate(CHALLENGE_END_DATE)} · Final leaderboard in`}
              />
            ) : (
              <span className="text-sm text-gray-400">
                Challenge closed. Final leaderboard reveals {FINAL_LEADERBOARD_DATE}.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      <p className="text-gray-500 text-sm">Loading…</p>
    </div>
  );
}

function shareText(results, streak, profile) {
  const score = results.filter((r) => r.is_correct).length;
  const streakLine = streak?.current_streak > 1 ? ` Day ${streak.current_streak} streak 🔥.` : "";
  return `I scored ${score}/${results.length} on today's PYQ Daily (${profile?.class} · ${profile?.exam}).${streakLine} Beat me 👉`;
}

function Reveal({ challengeClosed, results, streak, leaderboard, chapters, profile, stats }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setSiteUrl(window.location.origin);
  }, []);

  function handleShare() {
    const text = `${shareText(results, streak, profile)} ${siteUrl}`;
    track("share_clicked");
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  if (challengeClosed) {
    return (
      <div className="glass rounded-3xl p-8 text-center animate-fade-up shadow-card">
        <p className="text-lg font-display font-semibold mb-1">The daily challenge has ended.</p>
        <p className="text-gray-400 text-sm">
          Final leaderboard reveals on <span className="text-gold font-semibold">{FINAL_LEADERBOARD_DATE}</span>.
        </p>
      </div>
    );
  }

  if (!results) return <Loading />;

  const score = results.filter((r) => r.is_correct).length;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-up">
      <div className="relative glass rounded-3xl px-5 sm:px-6 pt-4 pb-6 shadow-card overflow-hidden">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/25 blur-3xl rounded-full pointer-events-none -z-10" />
        <div className="relative">
          <ScoreReveal score={score} total={results.length} />

          {streak?.current_streak > 0 && (
            <div className="mb-4">
              <StreakFlame current={streak.current_streak} />
            </div>
          )}

          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-good/20 to-teal/20 hover:from-good/30 hover:to-teal/30 text-good border border-good/30 transition rounded-xl py-3.5 font-semibold text-sm active:scale-[0.98]"
          >
            Share your score →
          </button>
        </div>
      </div>

      <Tabs
        onChange={(key) => track(`tab_viewed_${key}`)}
        tabs={[
          {
            key: "solutions",
            label: "Review",
            content: <SolutionsList results={results} />,
          },
          {
            key: "leaderboard",
            label: "Leaderboard",
            content: <LeaderboardList leaderboard={leaderboard} stats={stats} profile={profile} />,
          },
          {
            key: "chapters",
            label: "Progress",
            content: <ChaptersList chapters={chapters} />,
          },
        ]}
      />

      <p className="text-center text-xs text-gray-500 px-2">
        Come back tomorrow to keep your streak alive. Challenge runs through {CHALLENGE_END_DATE}.
      </p>
    </div>
  );
}

function SolutionsList({ results }) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 space-y-4 shadow-card">
      {results.map((r, i) => (
        <div key={r.question_id} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
          <p className="text-sm text-gray-400 mb-1">
            Q{i + 1} {r.chapter ? `· ${r.chapter}` : ""} {r.year ? `· ${r.year}` : ""}
          </p>
          <div className="rich-content mb-2" dangerouslySetInnerHTML={{ __html: r.question }} />
          <p className={`text-sm font-semibold ${r.is_correct ? "text-good" : "text-bad"}`}>
            {r.is_correct ? "Correct" : `Your answer: ${r.selected_option || "—"}`} · Correct: {r.correct_option}
          </p>
          {r.solution && (
            <div className="rich-content text-sm text-gray-400 mt-1.5" dangerouslySetInnerHTML={{ __html: r.solution }} />
          )}
        </div>
      ))}
    </div>
  );
}

function LeaderboardList({ leaderboard, stats, profile }) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-1">
        <h2 className="text-sm font-semibold text-gray-300">
          {profile?.class} · {profile?.exam} — today
        </h2>
        {stats?.playersToday > 0 && <span className="text-xs text-gray-500">{stats.playersToday} played today</span>}
      </div>
      {leaderboard.length === 0 ? (
        <p className="text-gray-500 text-sm">No entries yet today.</p>
      ) : (
        <div className="space-y-1">
          {leaderboard.slice(0, 20).map((r) => (
            <div
              key={r.player_id}
              className={`flex items-center justify-between text-sm py-2 px-2.5 rounded-lg ${
                r.rank <= 3 ? "bg-gradient-to-r from-gold/10 to-transparent" : ""
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-6 shrink-0 text-center ${r.rank <= 3 ? "text-gold font-bold" : "text-gray-500"}`}>
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </span>
                <span className="truncate">{r.name}</span>
                {r.streak > 1 && <span className="text-gold text-xs shrink-0">🔥{r.streak}</span>}
              </span>
              <span className="text-gray-400 shrink-0 font-medium">{r.correct}/{r.answered}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChaptersList({ chapters }) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 shadow-card">
      {chapters.length === 0 ? (
        <p className="text-gray-500 text-sm">Chapters you've touched will show up here.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">Consistency over time — {chapters.length} chapters touched</p>
          <div className="flex flex-wrap gap-2">
            {chapters.map((c) => (
              <span
                key={`${c.subject}-${c.chapter}`}
                className="text-xs bg-panel2 border border-white/10 rounded-full px-3 py-1.5 text-gray-300"
              >
                {c.chapter} <span className="text-teal">({c.correct}/{c.attempted})</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
