import { useEffect, useState } from "react";
import StepDots from "./StepDots";

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

      <div className="bg-panel border border-white/5 rounded-2xl p-5 sm:p-6 md:p-7 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-accent bg-accent/15 rounded-full px-2.5 py-1">
            Question {index + 1} of {questions.length}
          </span>
          {q.year && (
            <span className="text-xs font-semibold text-gold bg-gold/10 rounded-full px-2.5 py-1">{q.year}</span>
          )}
        </div>
        {q.chapter && (
          <p className="text-xs text-gray-500 mb-2">
            {q.subject ? `${q.subject} · ` : ""}
            {q.chapter}
          </p>
        )}
        <p className="text-base md:text-lg font-medium mb-5 leading-relaxed min-h-[3em]">{q.question}</p>

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
                {text}
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
            <p className="font-semibold mb-0.5">{feedback.is_correct ? "Correct! 🎯" : "Not quite."}</p>
            {feedback.solution && <p className="text-gray-400 font-normal">{feedback.solution}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
