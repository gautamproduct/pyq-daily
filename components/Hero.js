export default function Hero({ onStart }) {
  return (
    <div className="text-center animate-pop">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-accent/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
          PYQ <span className="text-gold">Daily</span>
        </h1>
      </div>

      <p className="text-gray-300 text-base sm:text-lg max-w-md mx-auto mb-1">
        3 previous-year JEE/NEET questions. Every day. Free.
      </p>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">
        Show up daily, build a streak, and see where you rank against everyone else grinding toward the same exam.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Pill emoji="🔥" text="Build a streak" />
        <Pill emoji="🏆" text="Daily leaderboard" />
        <Pill emoji="📅" text="Ends Aug 15" />
      </div>

      <button
        onClick={onStart}
        className="bg-accent hover:bg-accent/90 active:scale-[0.98] transition rounded-xl px-8 py-4 font-semibold text-lg shadow-lg shadow-accent/20"
      >
        Start today's challenge →
      </button>
      <p className="text-xs text-gray-600 mt-4">Takes 60 seconds. No password, no email.</p>
    </div>
  );
}

function Pill({ emoji, text }) {
  return (
    <span className="text-xs font-medium bg-panel2 border border-white/10 rounded-full px-3 py-1.5 text-gray-300">
      {emoji} {text}
    </span>
  );
}
