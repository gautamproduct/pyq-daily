import { useEffect, useState } from "react";
import StepDots from "./StepDots";
import QuestionMeta from "./QuestionMeta";

// One question at a time, instant right/wrong feedback on tap — the core
// Duolingo-style loop. Advances automatically a beat after feedback lands
// so the pace stays snappy without needing an extra tap.
export default function QuizFlow({ questions, onAnswer, onAllDone }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState(null); // { selected, is_correct, correct_option, solution }
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    setStartedAt(Date.now());
    setFeedback(null);
  }, [index]);

  const q = questions[index];
  if (!q) return null;

  async function pick(option) {
    if (feedback || busy) return;
    setBusy(true);
    const timeTaken = Date.now() - startedAt;
    const result = await onAnswer(q.id, option, timeTaken);
    setBusy(false);
    if (!result) return;
    setFeedback({ selected: option, ...result });

    const delay = 1300;
    setTimeout(() => {
      if (result.done) {
        onAllDone(result);
      } else {
        setIndex((i) => i + 1);
      }
    }, delay);
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
        <QuestionMeta subject={q.subject} chapter={q.chapter} year={q.year} className="mb-3" />
        <div
          className="rich-content text-base md:text-lg font-medium mb-5 leading-relaxed min-h-[3em]"
          dangerouslySetInnerHTML={{ __html: q.question }}
        />

        <div className="grid gap-2.5">
          {["A", "B", "C", "D"].map((opt) => {
            const text = q[`option_${opt.toLowerCase()}`];
            let cls = "border-white/10 bg-panel2 text-gray-300 hover:border-white/20";
            if (feedback) {
              if (opt === feedback.correct_option) {
                cls = "border-good bg-good/20 text-white";
              } else if (opt === feedback.selected) {
                cls = "border-bad bg-bad/20 text-white";
              } else {
                cls = "border-white/5 bg-panel2/50 text-gray-500";
              }
            }
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={!!feedback || busy}
                className={`text-left px-4 py-3.5 rounded-xl border transition active:scale-[0.98] disabled:active:scale-100 ${cls}`}
              >
                <span className="text-gray-500 mr-2">{opt}.</span>
                <span className="rich-content inline" dangerouslySetInnerHTML={{ __html: text }} />
                {feedback && opt === feedback.correct_option && <span className="float-right">✓</span>}
                {feedback && opt === feedback.selected && opt !== feedback.correct_option && (
                  <span className="float-right">✕</span>
                )}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm animate-pop ${
              feedback.is_correct ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
            }`}
          >
            <p className="font-semibold mb-0.5">
              {feedback.is_correct ? "Correct! 🎯" : `Not quite — correct answer: ${feedback.correct_option}`}
            </p>
            {feedback.solution ? (
              <div
                className="rich-content text-gray-400 font-normal"
                dangerouslySetInnerHTML={{ __html: feedback.solution }}
              />
            ) : (
              <p className="text-gray-500 font-normal italic">No written solution for this one.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
