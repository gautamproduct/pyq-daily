import { useEffect, useState } from "react";
import Head from "next/head";
import Countdown from "../components/Countdown";
import Countdown321 from "../components/Countdown321";
import Hero from "../components/Hero";
import OnboardingWizard from "../components/OnboardingWizard";
import QuizFlow from "../components/QuizFlow";
import ScoreReveal from "../components/ScoreReveal";
import StreakFlame from "../components/StreakFlame";
import Tabs from "../components/Tabs";
import ErrorBanner from "../components/ErrorBanner";
import ProfileModal from "../components/ProfileModal";
import BadgeUnlock from "../components/BadgeUnlock";
import QuestionMeta from "../components/QuestionMeta";
import { burstConfetti } from "../lib/confetti";
import { CHALLENGE_END_DATE, FINAL_LEADERBOARD_DATE, isChallengeOpen, formatShortDate } from "../lib/campaign";
import { getDeviceId, getSavedProfile, saveProfile, track } from "../lib/device";
import { safeFetchJson } from "../lib/safe-fetch";
import { TRUE_FIGHTER_STREAK, hasSeenTrueFighterBadge, markTrueFighterBadgeSeen } from "../lib/badges";

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
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [showBadge, setShowBadge] = useState(false);

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

  useEffect(() => {
    if (
      streak?.current_streak >= TRUE_FIGHTER_STREAK &&
      streak?.current_streak < TRUE_FIGHTER_STREAK + 1 &&
      !hasSeenTrueFighterBadge()
    ) {
      setShowBadge(true);
    }
  }, [streak]);

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
      setResults(data.results);
      setStreak(data.streak);
      setStage("reveal");
      if (data.results) {
        loadLeaderboard(p);
        loadChapters();
        loadStats(p);
      }
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

  async function handleProfileSave(updates) {
    setProfileSaving(true);
    setProfileError(null);
    const device_id = getDeviceId();
    const data = await safeFetchJson("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id, ...updates }),
    });
    setProfileSaving(false);
    if (data.error) {
      setProfileError(data.error);
      return;
    }
    const p = { name: updates.name, class: updates.class, exam: updates.exam };
    saveProfile(p);
    setProfile(p);
    track("profile_updated", p);
    setShowProfile(false);
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

  function closeBadge() {
    markTrueFighterBadgeSeen();
    setShowBadge(false);
  }

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8 md:py-14">
      <Head>
        <title>The Daily PYQ Challenge — PYQ Daily</title>
      </Head>
      <div className="max-w-2xl mx-auto">
        {stage !== "hero" && (
          <Header compact={stage === "quiz"} profile={profile} onProfileClick={() => setShowProfile(true)} />
        )}

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {stage === "loading" && <Loading />}

        {stage === "hero" && <Hero onStart={() => setStage("onboarding")} />}

        {stage === "onboarding" && <OnboardingWizard onComplete={handleOnboard} submitting={onboardSubmitting} />}

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

        {stage === "reveal" && (
          <div className="text-center mt-8">
            <a href="/final" className="text-xs text-gray-500 hover:text-gold transition">
              View final leaderboard →
            </a>
          </div>
        )}
      </div>

      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => {
            setShowProfile(false);
            setProfileError(null);
          }}
          onSave={handleProfileSave}
          saving={profileSaving}
          error={profileError}
        />
      )}

      {showBadge && <BadgeUnlock onClose={closeBadge} />}
    </div>
  );
}

function Header({ compact, profile, onProfileClick }) {
  const open = isChallengeOpen();
  const initial = profile?.name?.trim()?.[0]?.toUpperCase() || "🙂";
  return (
    <div className={`relative text-center animate-fade-up ${compact ? "mb-4" : "mb-6 sm:mb-8"}`}>
      {profile && (
        <button
          onClick={onProfileClick}
          aria-label="Edit your profile"
          className="group absolute right-0 top-0 -m-2.5 p-2.5 active:scale-95 transition"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 text-white font-display font-bold text-sm shadow-glow ring-2 ring-white/15">
            {initial}
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-panel border border-white/15 flex items-center justify-center text-[9px] leading-none text-gray-300 group-hover:text-gold transition">
              ✎
            </span>
          </span>
        </button>
      )}
      <h1 className={`font-display font-extrabold tracking-tight ${compact ? "text-xl" : "text-2xl sm:text-3xl md:text-4xl"}`}>
        PYQ <span className="text-gradient">Daily</span>
      </h1>
      {!compact && (
        <div className="mt-3 flex justify-center px-2">
          {open ? (
            <Countdown
              targetDate={FINAL_LEADERBOARD_DATE}
              label={`Ends ${formatShortDate(CHALLENGE_END_DATE)} · Leaderboard in`}
            />
          ) : (
            <span className="text-sm text-gray-400">
              Challenge closed. Final leaderboard reveals {formatShortDate(FINAL_LEADERBOARD_DATE)}.
            </span>
          )}
        </div>
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

function shareLink(text, siteUrl, eventName) {
  track(eventName);
  const full = `${text} ${siteUrl}`;
  if (navigator.share) {
    navigator.share({ text: full }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, "_blank");
  }
}

function Reveal({ challengeClosed, results, streak, leaderboard, chapters, profile, stats }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setSiteUrl(window.location.origin);
  }, []);

  if (challengeClosed && !results) {
    return (
      <div className="glass rounded-3xl p-8 text-center animate-fade-up shadow-card">
        <p className="text-lg font-display font-semibold mb-1">The daily challenge has ended.</p>
        <p className="text-gray-400 text-sm">
          Final leaderboard reveals on <span className="text-gold font-semibold">{formatShortDate(FINAL_LEADERBOARD_DATE)}</span>.
        </p>
      </div>
    );
  }

  if (!results) return <Loading />;

  const score = results.filter((r) => r.is_correct).length;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-up">
      {challengeClosed && (
        <div className="glass rounded-2xl px-4 py-3 text-center text-sm text-gray-300 border border-gold/20">
          The challenge has ended — here's how your last day went. Final leaderboard reveals{" "}
          <span className="text-gold font-semibold">{formatShortDate(FINAL_LEADERBOARD_DATE)}</span>.
        </div>
      )}

      <div className="relative glass rounded-3xl px-5 sm:px-6 py-4 shadow-card overflow-hidden">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-accent/25 blur-3xl rounded-full pointer-events-none -z-10" />
        <div className={`relative flex items-center gap-3 mb-3 ${streak?.current_streak > 0 ? "" : "justify-center"}`}>
          <ScoreReveal score={score} total={results.length} />
          <StreakFlame current={streak?.current_streak} />
        </div>

        <button
          onClick={() => shareLink(shareText(results, streak, profile), siteUrl, "share_clicked")}
          className="relative w-full bg-gradient-to-r from-good/20 to-teal/20 hover:from-good/30 hover:to-teal/30 text-good border border-good/30 transition rounded-xl py-3 font-semibold text-sm active:scale-[0.98]"
        >
          Share your score →
        </button>
      </div>

      <Tabs
        onChange={(key) => track(`tab_viewed_${key}`)}
        tabs={[
          {
            key: "leaderboard",
            label: "Leaderboard",
            content: (
              <LeaderboardList
                leaderboard={leaderboard}
                stats={stats}
                profile={profile}
                onShare={() =>
                  shareLink(
                    `I'm on the PYQ Daily leaderboard for ${profile?.class} · ${profile?.exam} 🏆. Come beat my rank 👉`,
                    siteUrl,
                    "leaderboard_share_clicked"
                  )
                }
              />
            ),
          },
          {
            key: "solutions",
            label: "Review",
            content: <SolutionsList results={results} />,
          },
          {
            key: "chapters",
            label: "Progress",
            content: <ChaptersList chapters={chapters} />,
          },
        ]}
      />

      <div className="rounded-2xl bg-gradient-to-r from-accent/15 to-gold/10 border border-accent/20 p-4 text-center">
        <p className="text-sm font-semibold text-white mb-0.5">Come back tomorrow 👋</p>
        <p className="text-xs text-gray-400">
          A fresh set drops every morning. Challenge runs through {formatShortDate(CHALLENGE_END_DATE)}.
        </p>
      </div>
    </div>
  );
}

function SolutionsList({ results }) {
  const correct = results.filter((r) => r.is_correct).length;
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-gray-300">Today's review</h2>
        <span className="text-xs text-gray-500">
          {correct}/{results.length} correct · tap to see the solution
        </span>
      </div>
      <div className="space-y-2">
        {results.map((r, i) => (
          <SolutionRow key={r.question_id} r={r} index={i} />
        ))}
      </div>
    </div>
  );
}

function SolutionRow({ r, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/8 bg-panel2/50 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-white/5 transition"
      >
        <span
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            r.is_correct ? "bg-good/20 text-good" : "bg-bad/20 text-bad"
          }`}
        >
          {r.is_correct ? "✓" : "✕"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-200">Question {index + 1}</span>
          <QuestionMeta subject={r.subject} chapter={r.chapter} year={r.year} className="mt-1" />
        </span>
        <span className={`shrink-0 text-gray-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="px-3.5 pb-4 pt-1 border-t border-white/5">
          <div className="rich-content text-sm mb-2 mt-2" dangerouslySetInnerHTML={{ __html: r.question }} />
          <p className={`text-sm font-semibold ${r.is_correct ? "text-good" : "text-bad"}`}>
            {r.is_correct ? "You got it right" : `Your answer: ${r.selected_option || "—"}`} · Correct: {r.correct_option}
          </p>
          {r.solution ? (
            <div className="rich-content text-sm text-gray-400 mt-1.5" dangerouslySetInnerHTML={{ __html: r.solution }} />
          ) : (
            <p className="text-sm text-gray-600 mt-1.5 italic">No written solution for this one — just the answer key.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardList({ leaderboard, stats, profile, onShare }) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
        <h2 className="text-sm font-semibold text-gray-300">
          {profile?.class} · {profile?.exam} — today
        </h2>
        {stats?.playersToday > 0 && <span className="text-xs text-gray-500">{stats.playersToday} played today</span>}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Ranked by correct answers today. The #1 overall spot is decided by consistency —{" "}
        <a href="/final" className="text-gold hover:underline">see the full race →</a>
      </p>
      {leaderboard.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">No entries yet today.</p>
      ) : (
        <div className="space-y-1 mb-4">
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
      <button
        onClick={onShare}
        className="w-full bg-gradient-to-r from-accent/20 to-gold/10 hover:from-accent/30 hover:to-gold/20 text-white border border-accent/30 transition rounded-xl py-2.5 font-semibold text-sm active:scale-[0.98]"
      >
        Share the leaderboard →
      </button>
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
