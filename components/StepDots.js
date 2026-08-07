export default function StepDots({ total, current }) {
  return (
    <div className="flex justify-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-7 bg-gradient-to-r from-accent to-gold shadow-glow"
              : i < current
              ? "w-1.5 bg-accent/50"
              : "w-1.5 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}
