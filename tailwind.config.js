/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080a14",
        panel: "#141225",
        panel2: "#1c1934",
        accent: "#8b6cf7",
        accent2: "#5b4fe0",
        gold: "#f2c94c",
        teal: "#2dd4bf",
        good: "#2ee6a6",
        bad: "#ff5d7a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(139, 108, 247, 0.55)",
        goldglow: "0 0 30px -6px rgba(242, 201, 76, 0.5)",
        card: "0 8px 30px -12px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
