import { useState } from "react";
import { CLASSES, EXAMS } from "../lib/campaign";
import { ONBOARD_STEPS } from "../lib/copy";
import StepDots from "./StepDots";

const STEP_KEYS = ["name", "class", "exam"];

export default function OnboardingWizard({ onComplete, submitting }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [klass, setKlass] = useState(null);
  const [exam, setExam] = useState(null);

  const meta = ONBOARD_STEPS[STEP_KEYS[step]];

  function next() {
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleNameSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    next();
  }

  function pickClass(v) {
    setKlass(v);
    setTimeout(next, 150);
  }

  function pickExam(v) {
    setExam(v);
    setTimeout(() => onComplete({ name: name.trim(), class: klass, exam: v }), 150);
  }

  return (
    <div className="bg-panel border border-white/5 rounded-2xl p-6 sm:p-8 animate-pop min-h-[380px] flex flex-col">
      <StepDots total={3} current={step} />

      {step > 0 && (
        <button
          onClick={back}
          className="text-xs text-gray-500 hover:text-gray-300 mb-3 self-start transition"
        >
          ← Back
        </button>
      )}

      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{meta.eyebrow}</p>
      <h2 className="text-xl sm:text-2xl font-bold mb-1">{meta.title}</h2>
      <p className="text-sm text-gray-500 mb-6">{meta.subtitle}</p>

      <div className="flex-1 flex flex-col justify-center">
        {step === 0 && (
          <form onSubmit={handleNameSubmit}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Rahul"
              className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-4 mb-5 outline-none focus:border-accent text-lg text-center"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-accent hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 transition rounded-xl py-4 font-semibold text-base"
            >
              Continue →
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-3">
            {CLASSES.map((c) => (
              <BigOption key={c.value} label={c.label} onClick={() => pickClass(c.value)} selected={klass === c.value} />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3">
            {EXAMS.map((ex) => (
              <BigOption key={ex.value} label={ex.label} onClick={() => pickExam(ex.value)} selected={exam === ex.value} accent="gold" />
            ))}
          </div>
        )}
      </div>

      {submitting && <p className="text-center text-xs text-gray-500 mt-4">Setting you up…</p>}
    </div>
  );
}

function BigOption({ label, onClick, selected, accent = "accent" }) {
  const border = accent === "gold" ? "border-gold bg-gold/15" : "border-accent bg-accent/15";
  return (
    <button
      onClick={onClick}
      className={`text-left px-5 py-4 rounded-xl border transition active:scale-[0.98] text-lg font-medium ${
        selected ? border : "border-white/10 bg-panel2 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}
