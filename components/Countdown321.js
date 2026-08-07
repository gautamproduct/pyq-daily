import { useEffect, useState } from "react";

// A quick "3, 2, 1, Go!" beat before the quiz starts — a small ritual that
// signals "this is timed, focus up" (borrowed from Duolingo lesson starts /
// game-show countdowns). Vibrates on supporting devices for a tactile cue.
export default function Countdown321({ onDone }) {
  const steps = ["3", "2", "1", "Go!"];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(15);
    if (i >= steps.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      setI((v) => v + 1);
    }, i === steps.length - 1 ? 450 : 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const isGo = i === steps.length - 1;
  return (
    <div className="relative flex flex-col items-center justify-center py-24 select-none">
      <div
        className="absolute w-48 h-48 rounded-full blur-3xl -z-10 transition-colors duration-300"
        style={{ background: isGo ? "rgba(242,201,76,0.35)" : "rgba(139,108,247,0.35)" }}
      />
      <div
        key={i}
        className="font-display text-7xl md:text-8xl font-extrabold animate-pop"
        style={{
          color: isGo ? "#f2c94c" : "#a78bfa",
          textShadow: isGo ? "0 0 40px rgba(242,201,76,0.6)" : "0 0 40px rgba(139,108,247,0.6)",
        }}
      >
        {steps[i]}
      </div>
      <p className="text-gray-500 text-sm mt-6">Get ready…</p>
    </div>
  );
}
