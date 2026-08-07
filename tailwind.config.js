/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f19",
        panel: "#131a2b",
        panel2: "#1a2338",
        accent: "#6c5ce7",
        gold: "#e8c76b",
        good: "#22c55e",
        bad: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
