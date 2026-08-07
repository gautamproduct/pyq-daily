export default function BadgeUnlock({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-3xl p-8 max-w-sm w-full text-center shadow-card animate-pop overflow-hidden">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 bg-gold/30 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="text-6xl mb-3 animate-flicker">🏅</div>
        <p className="text-xs font-semibold text-gold uppercase tracking-wide mb-1">Badge unlocked</p>
        <h2 className="font-display text-2xl font-extrabold mb-4">True Fighter</h2>

        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          This puts you ahead of <span className="text-gold font-semibold">99% of the competition</span>. The
          competition isn't even that big — most people around you are distracted, addicted to random things.
          You just showed up, every single day, for a week straight. That's consistency. That's discipline.
          You've already proved you're ahead. Congrats! 🎉
        </p>

        <button
          onClick={onClose}
          className="btn-primary w-full text-white active:scale-[0.98] transition rounded-xl py-3.5 font-display font-bold"
        >
          Let's keep going →
        </button>
      </div>
    </div>
  );
}
