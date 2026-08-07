import { useEffect, useState } from "react";
import { scoreMessage } from "../lib/copy";

// A compact ring + message, sized to sit side-by-side with the streak flame
// rather than stack above it — the score/streak block was eating so much
// vertical space it pushed the leaderboard below the fold.
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
    }, 180);
    return () => clearInterval(t);
  }, [score]);

  const pct = total > 0 ? shown / total : 0;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const ringColor = score === total ? "#f2c94c" : score === 0 ? "#ff5d7a" : "#8b6cf7";

  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.5s ease-out", filter: `drop-shadow(0 0 6px ${ringColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-base font-extrabold tracking-tight">
            {shown}
            <span className="text-gray-500 text-xs">/{total}</span>
          </span>
        </div>
      </div>
      <div className="text-left min-w-0 max-w-[104px]">
        <p className="text-2xl leading-none mb-0.5">{emoji}</p>
        <p className="text-gray-200 text-xs font-medium font-display leading-snug">{title}</p>
      </div>
    </div>
  );
}
