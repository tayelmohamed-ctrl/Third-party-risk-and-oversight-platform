/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        mal: {
          black: "#020A18",
          navy: "#10103C",
          purple: "#A953DF",
          cyan: "#39B9ED",
          white: "#F8F6FE",
        },
        bg: "#020A18",
        panel: "#0A1130",
        panel2: "#10103C",
        panel3: "#181a4d",
        line: "#26285C",
        lineSoft: "#191b46",
        ink: "#F8F6FE",
        muted: "#A7ACDB",
        faint: "#6E72A6",
        ai: "#A953DF",
        sayed: "#39B9ED",
        mohsen: "#A953DF",
        jana: "#7C6CF7",
        low: "#2FD8A6",
        med: "#F6A623",
        hi: "#FF5C77",
        proh: "#B23A5B",
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "mal-grad": "linear-gradient(135deg, #A953DF, #39B9ED)",
      },
      keyframes: {
        flow: { "0%": { backgroundPosition: "-60% 0" }, "100%": { backgroundPosition: "160% 0" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
      },
      animation: {
        flow: "flow 1.8s linear infinite",
        pulse2: "pulse2 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
