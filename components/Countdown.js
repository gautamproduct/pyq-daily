import { useEffect, useState } from "react";
import { msUntilIST } from "../lib/campaign";

export default function Countdown({ targetDate, label }) {
  // Start null so server and first client render match (both render
  // nothing); compute the real value only after mount to avoid a
  // hydration mismatch from the in-flight seconds ticking during SSR.
  const [ms, setMs] = useState(null);

  useEffect(() => {
    setMs(msUntilIST(targetDate));
    const t = setInterval(() => setMs(msUntilIST(targetDate)), 1000);
    return () => clearInterval(t);
  }, [targetDate]);

  if (ms === null || ms <= 0) return null;

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-gray-300 text-center">
      <span className="text-gray-400">{label}</span>
      <div className="flex gap-1 sm:gap-1.5 font-mono">
        {[
          [days, "d"],
          [hours, "h"],
          [mins, "m"],
          [secs, "s"],
        ].map(([v, u]) => (
          <span key={u} className="bg-panel2 rounded px-1.5 sm:px-2 py-1 text-gold font-semibold text-xs sm:text-sm">
            {String(v).padStart(2, "0")}
            <span className="text-gray-400 font-normal">{u}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
