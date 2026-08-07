import { useEffect, useState } from "react";
import StepDots from "./StepDots";
import QuestionMeta from "./QuestionMeta";

// One question at a time. Correctness is never shown mid-quiz — only in the
// end-of-quiz review — so there's nothing to wait on: tapping an option
// locks it, fires the answer off, and advances the instant the server
// acknowledges (no artificial delay).
export default function QuizFlow({ questions, exam, onAnswer, onAllDone }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    setStartedAt(Date.now());
    setSelected(null);
  }, [index]);

  const q = questions[index];
  if (!q) return null;

  async function pick(option) {
    if (selected || busy) return;
    setSelected(option);
    setBusy(true);
    const timeTaken = Date.now() - startedAt;
    const result = await onAnswer(q.id, option, timeTaken);
    setBusy(false);
    if (!result) {
      setSelected(null); // request failed — let them retry
      return;
    }
    if (result.done) {
      onAllDone(result);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div>
      <StepDots total={questions.length} current={index} />

      <div className="glass rounded-3xl p-5 sm:p-6 md:p-7 animate-fade-up shadow-card relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-accent/15 blur-3xl rounded-full pointer-events-none -z-10" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white bg-gradient-to-r from-accent to-accent2 rounded-full px-3 py-1.5 shadow-glow">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <QuestionMeta subject={q.subject} chapter={q.chapter} exam={exam} year={q.year} className="mb-3" />
        <div
          className="rich-content text-base md:text-lg font-medium mb-5 leading-relaxed min-h-[3em]"
          dangerouslySetInnerHTML={{ __html: q.question }}
        />

        <div className="grid gap-2.5">
          {["A", "B", "C", "D"].map((opt) => {
            const text = q[`option_${opt.toLowerCase()}`];
            let cls = "border-white/10 bg-panel2 text-gray-300 hover:border-white/20";
            if (selected === opt) {
              cls = "border-accent bg-accent/20 text-white shadow-glow";
            } else if (selected) {
              cls = "border-white/5 bg-panel2/50 text-gray-500";
            }
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={!!selected || busy}
                className={`text-left px-4 py-3.5 rounded-xl border transition active:scale-[0.98] disabled:active:scale-100 ${cls}`}
              >
                <span className="text-gray-500 mr-2">{opt}.</span>
                <span className="rich-content inline" dangerouslySetInnerHTML={{ __html: text }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
