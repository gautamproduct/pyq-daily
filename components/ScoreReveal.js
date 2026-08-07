import { useEffect, useState } from "react";
import { scoreMessage } from "../lib/copy";

// The "Lesson Complete" moment — score count-up inside a filling ring, given
// its own visual beat before the leaderboard/solutions compete for attention.
export default function ScoreReveal({ score, total }) {
  const [shown, setShown] = useState(0);
  const { emoji, title } = scoreMessage(score, total);

  useEffect(() => {
    setShown(0);
    if (score === 0) return;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= score) clearInterval(t);
    }, 220);
    return () => clearInterval(t);
  }, [score]);

  const pct = total > 0 ? shown / total : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ringColor = score === total ? "#f2c94c" : score === 0 ? "#ff5d7a" : "#8b6cf7";

  return (
    <div className="text-center py-6 animate-pop">
      <div className="relative w-36 h-36 mx-auto mb-3">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.5s ease-out", filter: `drop-shadow(0 0 8px ${ringColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-extrabold tracking-tight">
            {shown}
            <span className="text-gray-500 text-2xl">/{total}</span>
          </span>
        </div>
      </div>
      <div className="text-4xl mb-1">{emoji}</div>
      <p className="text-gray-200 font-medium font-display">{title}</p>
    </div>
  );
}
