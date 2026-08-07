import { useEffect, useState } from "react";
import { scoreMessage } from "../lib/copy";

// The "Lesson Complete" moment — score count-up + a hero message, given its
// own visual beat before the leaderboard/solutions compete for attention.
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

  return (
    <div className="text-center py-6 animate-pop">
      <div className="text-5xl mb-2">{emoji}</div>
      <div className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-2">
        {shown}
        <span className="text-gray-500">/{total}</span>
      </div>
      <p className="text-gray-300 font-medium">{title}</p>
    </div>
  );
}
