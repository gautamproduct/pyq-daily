import { useEffect, useState } from "react";
import StepDots from "./StepDots";
import QuestionMeta from "./QuestionMeta";

// One question at a time. Correctness is never shown mid-quiz — only in the
// end-of-quiz review — so answering locks a question and advances the
// instant the server acknowledges. Prev/Next arrows let you glance back at
// questions you've already locked in (read-only — answers can't change
// once submitted) without letting you skip ahead to ones you haven't
// reached yet.
export default function QuizFlow({ questions, exam, onAnswer, onAllDone }) {
  const [frontier, setFrontier] = useState(0); // highest index reached (current unanswered one)
  const [index, setIndex] = useState(0); // index currently being viewed
  const [answers, setAnswers] = useState({}); // index -> selected option, for answered questions
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    if (index === frontier) setStartedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const q = questions[index];
  if (!q) return null;

  const viewingFrontier = index === frontier;
  const selectedForView = answers[index] ?? null;

  async function pick(option) {
    if (!viewingFrontier || selectedForView || busy) return;
    setBusy(true);
    const timeTaken = Date.now() - startedAt;
    const result = await onAnswer(q.id, option, timeTaken);
    setBusy(false);
    if (!result) return; // request failed — let them retry, nothing locked in yet

    setAnswers((a) => ({ ...a, [index]: option }));
    if (result.done) {
      onAllDone(result);
    } else {
      setFrontier((f) => f + 1);
      setIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }
  function goNext() {
    if (index < frontier) setIndex((i) => i + 1);
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
            if (selectedForView === opt) {
              cls = "border-accent bg-accent/20 text-white shadow-glow";
            } else if (selectedForView || !viewingFrontier) {
              cls = "border-white/5 bg-panel2/50 text-gray-500";
            }
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={!viewingFrontier || !!selectedForView || busy}
                className={`text-left px-4 py-3.5 rounded-xl border transition active:scale-[0.98] disabled:active:scale-100 ${cls}`}
              >
                <span className="text-gray-500 mr-2">{opt}.</span>
                <span className="rich-content inline" dangerouslySetInnerHTML={{ __html: text }} />
              </button>
            );
          })}
        </div>

        {frontier > 0 && (
          <div className="relative flex items-center justify-between mt-5 pt-4 border-t border-white/5">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition flex items-center gap-1 px-2 py-1"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-600">
              {index + 1} / {questions.length}
            </span>
            <button
              onClick={goNext}
              disabled={index >= frontier}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition flex items-center gap-1 px-2 py-1"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
