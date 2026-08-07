export default function Hero({ onStart }) {
  return (
    <div className="relative text-center animate-pop">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/30 blur-3xl rounded-full -z-10" />
      <div className="absolute top-20 left-4 w-32 h-32 bg-gold/20 blur-3xl rounded-full -z-10 animate-float" />
      <div className="absolute top-32 right-4 w-32 h-32 bg-teal/20 blur-3xl rounded-full -z-10 animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="inline-flex items-center gap-1.5 bg-panel2/80 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-400 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
        Live daily challenge · ends Aug 15
      </div>

      <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight mb-3 leading-[1.05]">
        PYQ <span className="text-gradient">Daily</span>
      </h1>

      <p className="text-gray-200 text-base sm:text-xl font-medium max-w-md mx-auto mb-2">
        3 previous-year JEE/NEET questions. Every day. Free.
      </p>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">
        Show up daily, build a streak, and see where you rank against everyone else grinding toward the same exam.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-9">
        <Pill emoji="🔥" text="Build a streak" glow="gold" />
        <Pill emoji="🏆" text="Daily leaderboard" glow="accent" />
        <Pill emoji="📅" text="Ends Aug 15" glow="teal" />
      </div>

      <button
        onClick={onStart}
        className="btn-primary animate-glow-pulse text-white active:scale-[0.97] transition rounded-2xl px-9 py-4 font-display font-bold text-lg"
      >
        Start today's challenge →
      </button>
      <p className="text-xs text-gray-600 mt-4">Takes 60 seconds. No password, no email.</p>
    </div>
  );
}

function Pill({ emoji, text, glow }) {
  const glowMap = {
    gold: "shadow-goldglow border-gold/20",
    accent: "shadow-glow border-accent/20",
    teal: "border-teal/20",
  };
  return (
    <span className={`text-xs font-medium glass rounded-full px-3.5 py-2 text-gray-200 ${glowMap[glow] || ""}`}>
      {emoji} {text}
    </span>
  );
}
