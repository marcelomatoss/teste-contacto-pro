import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "thinking": "thinking 1.4s ease-in-out infinite",
      },
      keyframes: {
        thinking: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
      boxShadow: {
        "card": "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 4px -2px rgb(0 0 0 / 0.06)",
        "card-lg": "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 8px 24px -8px rgb(0 0 0 / 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
