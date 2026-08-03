import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EY primary palette (EY Brand Identity Guidelines). Values marked
        // "derived" are tints we mix for UI surfaces the brand palette
        // does not specify.
        ey: {
          yellow: "#FFE600",
          "yellow-600": "#E1CB00", // derived: hover state for yellow fills
          black: "#1A1A24", // Confident Black
          ink: "#2E2E38", // Off Black - primary text
          gray: "#747480", // Gray 01 - secondary text
          "gray-200": "#C4C4CD", // Gray 02 - control borders
          "gray-100": "#E1E1E6", // derived: hairlines, bar tracks
          offwhite: "#F6F6FA",
        },
        // Functional UI states only - deliberately muted so they read as
        // status, not as brand colour.
        state: {
          success: "#168736",
          warning: "#B35C00",
          danger: "#B8202E",
        },
      },
      fontFamily: {
        display: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,26,36,0.05), 0 1px 3px rgba(26,26,36,0.06)",
        "card-hover":
          "0 2px 4px rgba(26,26,36,0.06), 0 8px 24px rgba(26,26,36,0.08)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
