import { useState } from "react";
import { CLASSES, EXAMS } from "../lib/campaign";
import { fixedLabel } from "../lib/site-config";

// Single screen: tap class, tap exam, type name, go. Three sequential
// screens caused drop-off — taps are near-zero-friction so they come
// first, the one thing that needs typing comes last, right before the CTA.
//
// On a dedicated single-cohort domain (`fixed` set), class/exam are never
// asked — just shown as a badge — so it's name-only.
export default function OnboardingWizard({ onComplete, submitting, fixed }) {
  const [name, setName] = useState("");
  const [klass, setKlass] = useState(null);
  const [exam, setExam] = useState(null);

  const canSubmit = name.trim().length > 0 && (fixed || (klass && exam));

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onComplete({ name: name.trim(), class: fixed ? fixed.class : klass, exam: fixed ? fixed.exam : exam });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-3xl p-6 sm:p-8 animate-pop shadow-card relative overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-accent/20 blur-3xl rounded-full pointer-events-none -z-10" />

      <h2 className="font-display text-xl sm:text-2xl font-bold mb-1">Let's get you set up</h2>
      {fixed ? (
        <p className="text-sm text-gray-500 mb-6">
          You're on the{" "}
          <span className="text-gold font-semibold">{fixedLabel(fixed)}</span> challenge. Just need your name.
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-6">Takes 30 seconds. This is a one-time setup.</p>
      )}

      {!fixed && (
        <>
          <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Class</label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {CLASSES.map((c) => (
              <Chip key={c.value} label={c.label} selected={klass === c.value} onClick={() => setKlass(c.value)} accent="accent" />
            ))}
          </div>

          <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Exam</label>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {EXAMS.map((ex) => (
              <Chip key={ex.value} label={ex.label} selected={exam === ex.value} onClick={() => setExam(ex.value)} accent="gold" />
            ))}
          </div>
        </>
      )}

      <label className="block text-xs font-semibold text-gold uppercase tracking-wide mb-2">Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="e.g. Rahul"
        autoFocus={!!fixed}
        className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-3.5 mb-6 outline-none focus:border-accent focus:shadow-glow transition-shadow text-base"
      />

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="btn-primary w-full text-white active:scale-[0.98] disabled:opacity-40 disabled:shadow-none transition rounded-xl py-4 font-display font-bold text-base"
      >
        {submitting ? "Setting you up…" : "Start today's challenge →"}
      </button>

      {!fixed && (
        <p className="text-center text-xs text-gray-600 mt-3">
          Class & exam are locked once you start — no switching mid-leaderboard.
        </p>
      )}
    </form>
  );
}

function Chip({ label, selected, onClick, accent }) {
  const selectedCls =
    accent === "gold"
      ? "border-gold bg-gradient-to-r from-gold/20 to-transparent shadow-goldglow text-white"
      : "border-accent bg-gradient-to-r from-accent/25 to-transparent shadow-glow text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center py-3 px-1 rounded-lg border transition active:scale-[0.97] text-sm sm:text-base font-medium ${
        selected ? selectedCls : "border-white/10 bg-panel2/60 hover:border-white/25 hover:bg-panel2"
      }`}
    >
      {label}
    </button>
  );
}
