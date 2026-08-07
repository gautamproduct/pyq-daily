// The chapter and exam-year tags, each in its own highlighted box. Shared by
// the live quiz and the solutions list so they always look identical.
export default function QuestionMeta({ subject, chapter, exam, year, className = "" }) {
  if (!chapter && !year) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chapter && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 border border-accent/25 rounded-lg px-2.5 py-1">
          {subject && <span className="text-accent/60">{subject} ·</span>}
          {chapter}
        </span>
      )}
      {year && (
        <span className="inline-flex items-center text-xs font-bold text-gold bg-gold/10 border border-gold/25 rounded-lg px-2.5 py-1">
          {exam ? `${exam} ${year}` : year}
        </span>
      )}
    </div>
  );
}
