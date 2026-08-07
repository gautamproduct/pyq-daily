// Tiny dependency-free confetti burst — a few dozen divs, physics via CSS
// transition, self-cleaning. Good enough for a "perfect score" moment.
const COLORS = ["#6c5ce7", "#e8c76b", "#22c55e", "#ef4444", "#38bdf8"];

export function burstConfetti() {
  if (typeof document === "undefined") return;
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(container);

  const count = 60;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const color = COLORS[i % COLORS.length];
    const startX = 50 + (Math.random() * 30 - 15);
    const drift = Math.random() * 200 - 100;
    const rotate = Math.random() * 720 - 360;
    const size = 6 + Math.random() * 6;
    const delay = Math.random() * 150;
    const duration = 1400 + Math.random() * 900;

    el.style.cssText = `
      position:absolute; left:${startX}%; top:-10px;
      width:${size}px; height:${size * 0.5}px; background:${color};
      opacity:0.95; border-radius:2px;
      transform: translateY(0) rotate(0deg);
      transition: transform ${duration}ms cubic-bezier(.15,.6,.4,1) ${delay}ms, opacity ${duration}ms ease ${delay}ms;
    `;
    container.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${rotate}deg)`;
        el.style.opacity = "0";
      });
    });
  }

  setTimeout(() => container.remove(), 2600);
}
