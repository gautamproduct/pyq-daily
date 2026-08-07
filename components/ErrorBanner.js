export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-3 bg-bad/10 border border-bad/25 rounded-xl px-4 py-3 animate-pop">
      <span className="text-bad text-lg leading-none">⚠</span>
      <p className="text-sm text-bad/90 flex-1">{message}</p>
      <button onClick={onDismiss} className="text-bad/60 hover:text-bad text-sm leading-none">
        ✕
      </button>
    </div>
  );
}
