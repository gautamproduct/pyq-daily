import { useEffect, useState } from "react";
import Head from "next/head";
import Hero from "../components/Hero";
import OnboardingWizard from "../components/OnboardingWizard";
import QuizFlow from "../components/QuizFlow";
import ErrorBanner from "../components/ErrorBanner";
import ProfileModal from "../components/ProfileModal";
import QuestionMeta from "../components/QuestionMeta";
import { burstConfetti } from "../lib/confetti";
import { getDeviceId, getSavedProfile, saveProfile, track } from "../lib/device";
import { safeFetchJson } from "../lib/safe-fetch";
import { siteConfigForHost, fixedLabel } from "../lib/site-config";

export default function Home() {
  const [stage, setStage] = useState("loading"); // loading | hero | onboarding | quiz | reveal
  const [profile, setProfile] = useState(null);
  const [fixed, setFixed] = useState(null); // { class, exam, variant } on a dedicated single-cohort domain
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [challengeClosed, setChallengeClosed] = useState(false);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    track("page_view");
    setFixed(siteConfigForHost(window.location.hostname));
    const saved = getSavedProfile();
    if (saved) {
      setProfile(saved);
      loadToday(saved);
    } else {
      setStage("hero");
    }
  }, []);

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
      setStage("reveal");
      if (data.results) loadLeaderboard(p);
      return;
    }

    if (data.completed) {
      setResults(data.results);
      setStage("reveal");
      loadLeaderboard(p);
      return;
    }

    setQuestions(data.questions || []);
    setStage("quiz");
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
    setStage("reveal");
    track("quiz_completed", { score: final.score, total: final.total });
    if (final.score === final.total) setTimeout(burstConfetti, 200);
    loadLeaderboard(profile);
  }

  async function loadLeaderboard(p) {
    const device_id = getDeviceId();
    const data = await safeFetchJson(`/api/leaderboard?class=${p.class}&exam=${p.exam}&device_id=${device_id}`);
    if (!data.error) setLeaderboard(data.leaderboard || []);
  }

  return (
    <div className={`min-h-screen px-3 sm:px-4 flex flex-col ${stage === "hero" ? "justify-center py-10" : "py-6 sm:py-8 md:py-14"}`}>
      <Head>
        <title>The Daily PYQ Challenge — PYQ Daily</title>
      </Head>
      <div className="max-w-2xl w-full mx-auto">
        {stage !== "hero" && (
          <Header profile={profile} onProfileClick={() => setShowProfile(true)} fixed={fixed} />
        )}

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {stage === "loading" && <Loading />}

        {stage === "hero" && <Hero onStart={() => setStage("onboarding")} fixed={fixed} />}

        {stage === "onboarding" && (
          <OnboardingWizard onComplete={handleOnboard} submitting={onboardSubmitting} fixed={fixed} />
        )}

        {stage === "quiz" && (
          <QuizFlow questions={questions} exam={profile?.exam} onAnswer={handleAnswer} onAllDone={handleAllDone} />
        )}

        {stage === "reveal" && (
          <Results
            challengeClosed={challengeClosed}
            results={results}
            leaderboard={leaderboard}
            profile={profile}
          />
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
          fixed={fixed}
        />
      )}
    </div>
  );
}

function Header({ profile, onProfileClick, fixed }) {
  const initial = profile?.name?.trim()?.[0]?.toUpperCase() || "🙂";
  return (
    <div className="relative text-center animate-fade-up mb-6 sm:mb-8">
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
      <h1 className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl md:text-4xl">
        PYQ <span className="text-gradient">Daily</span>
      </h1>
      {fixed && (
        <span className="inline-flex items-center mt-2 bg-gold/10 border border-gold/25 rounded-full px-3 py-1 text-xs font-semibold text-gold">
          {fixedLabel(fixed)}
        </span>
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

function shareText(results, profile) {
  const score = results.filter((r) => r.is_correct).length;
  return `I scored ${score}/${results.length} on today's PYQ Daily (${profile?.class} · ${profile?.exam}). Beat me 👉`;
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

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function Results({ challengeClosed, results, leaderboard, profile }) {
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setSiteUrl(window.location.origin);
  }, []);

  if (challengeClosed && !results) {
    return (
      <div className="glass rounded-3xl p-8 text-center animate-fade-up shadow-card">
        <p className="text-lg font-display font-semibold">The challenge has ended.</p>
      </div>
    );
  }

  if (!results) return <Loading />;

  const score = results.filter((r) => r.is_correct).length;
  const total = results.length;
  const perfect = score === total;
  const zero = score === 0;
  const accentClass = perfect ? "text-gold" : zero ? "text-bad" : "text-accent";
  const glowClass = perfect ? "bg-gold/25" : zero ? "bg-bad/20" : "bg-accent/25";

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="relative glass rounded-3xl p-6 shadow-card text-center overflow-hidden">
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 ${glowClass} blur-3xl rounded-full pointer-events-none -z-10`} />
        <button
          onClick={() => shareLink(shareText(results, profile), siteUrl, "share_clicked")}
          aria-label="Share your score"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-panel2 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:border-accent/40 transition active:scale-95"
        >
          <ShareIcon />
        </button>
        <p className="font-display font-extrabold tracking-tight leading-none">
          <span className={`text-5xl tabular-nums ${accentClass}`}>{score}</span>
          <span className="text-2xl text-gray-500">/{total}</span>
        </p>
        <p className="text-sm text-gray-400 font-medium mt-1.5">correct</p>
      </div>

      <LeaderboardList leaderboard={leaderboard} profile={profile} />

      <SolutionsList results={results} exam={profile?.exam} />
    </div>
  );
}

const LEADERBOARD_PAGE_SIZE = 20;

function LeaderboardList({ leaderboard, profile }) {
  const [visibleCount, setVisibleCount] = useState(LEADERBOARD_PAGE_SIZE);
  const myName = profile?.name?.trim().toLowerCase();
  const visible = leaderboard.slice(0, visibleCount);
  const hasMore = visibleCount < leaderboard.length;

  return (
    <div className="relative glass rounded-3xl p-5 shadow-card overflow-hidden">
      <div className="absolute -top-20 -right-10 w-48 h-48 bg-gold/10 blur-3xl rounded-full pointer-events-none -z-10" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-bold text-white flex items-center gap-1.5">
          <span className="text-lg">🏆</span> Today's Leaderboard
        </h2>
        <span className="text-xs font-semibold text-gray-400 bg-panel2 border border-white/10 rounded-full px-2.5 py-1 shrink-0">
          {profile?.class} · {profile?.exam}
        </span>
      </div>
      {leaderboard.length === 0 ? (
        <p className="text-gray-500 text-sm">No entries yet today.</p>
      ) : (
        <>
          <div className="space-y-1">
            {visible.map((r) => {
              const isMe = r.name?.trim().toLowerCase() === myName;
              return (
                <div
                  key={r.player_id}
                  className={`flex items-center justify-between text-sm py-2.5 px-3 rounded-xl transition ${
                    isMe
                      ? "bg-accent/15 border border-accent/40"
                      : r.rank <= 3
                      ? "bg-gradient-to-r from-gold/10 to-transparent"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 shrink-0 text-center font-display ${r.rank <= 3 ? "text-gold font-bold text-base" : "text-gray-500 font-semibold"}`}>
                      {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                    </span>
                    <span className={`truncate ${isMe ? "text-white font-semibold" : "text-gray-200"}`}>
                      {r.name}
                      {isMe && <span className="text-accent text-xs font-normal ml-1.5">(you)</span>}
                    </span>
                  </span>
                  <span className={`shrink-0 font-bold tabular-nums ${isMe ? "text-accent" : "text-gray-400"}`}>
                    {r.correct}/{r.answered}
                  </span>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleCount((v) => v + LEADERBOARD_PAGE_SIZE)}
              className="w-full mt-3 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition rounded-xl py-2.5 active:scale-[0.98]"
            >
              Show more →
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SolutionsList({ results, exam }) {
  const [open, setOpen] = useState(false);
  // Only one question expanded at a time — lets prev/next arrows just move
  // this single index instead of juggling independent open states per row.
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="glass rounded-3xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left active:bg-white/5 transition"
      >
        <span className="text-sm font-semibold text-gray-300">Solutions</span>
        <span className={`text-gray-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {results.map((r, i) => (
            <SolutionRow
              key={r.question_id}
              r={r}
              index={i}
              total={results.length}
              exam={exam}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              onPrev={() => setOpenIndex(i - 1)}
              onNext={() => setOpenIndex(i + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SolutionRow({ r, index, total, exam, isOpen, onToggle, onPrev, onNext }) {
  return (
    <div className="rounded-xl border border-white/8 bg-panel2/50 overflow-hidden">
      <button
        onClick={onToggle}
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
          <QuestionMeta subject={r.subject} chapter={r.chapter} exam={exam} year={r.year} className="mt-1" />
        </span>
        <span className={`shrink-0 text-gray-500 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
      </button>

      {isOpen && (
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

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <button
              onClick={onPrev}
              disabled={index === 0}
              aria-label="Previous question"
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed hover:text-white transition px-2 py-1.5 -ml-2 rounded-lg active:scale-95"
            >
              ← Prev
            </button>
            <span className="text-[11px] text-gray-600">{index + 1} / {total}</span>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              aria-label="Next question"
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed hover:text-white transition px-2 py-1.5 -mr-2 rounded-lg active:scale-95"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
