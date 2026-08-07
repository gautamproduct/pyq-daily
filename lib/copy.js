// Centralized voice — playful, specific, a little competitive. Never generic.

export function scoreMessage(score, total) {
  if (score === total) return { emoji: "🔥", title: "Perfect. Absolutely on fire." };
  if (score === total - 1) return { emoji: "💪", title: "So close. That one's yours tomorrow." };
  if (score === 0) return { emoji: "📚", title: "Rough one. Tomorrow's a reset." };
  return { emoji: "👍", title: "Solid. Keep the streak alive." };
}

export function streakMessage(current) {
  if (current <= 1) return "Day one. Every streak starts here.";
  if (current < 5) return `${current} days in — momentum's building.`;
  if (current < 10) return `${current} days straight. This is a habit now.`;
  if (current < 20) return `${current} days. You're the one others are chasing.`;
  return `${current} days. Certified relentless.`;
}

export const ONBOARD_STEPS = {
  name: {
    eyebrow: "Step 1 of 3",
    title: "What should we call you?",
    subtitle: "Shows up on today's leaderboard.",
  },
  class: {
    eyebrow: "Step 2 of 3",
    title: "Which year are you in?",
    subtitle: "So we serve the right level of PYQs.",
  },
  exam: {
    eyebrow: "Step 3 of 3",
    title: "JEE or NEET?",
    subtitle: "Last one, promise.",
  },
};
