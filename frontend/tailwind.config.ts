import type { Config } from "tailwindcss";

// Design tokens sourced from UI/UX Pro Max skill recommendation for
// "Chat & Messaging App" — Messenger blue primary + online green accent,
// "Modern Professional" pairing (Poppins headings + Open Sans body).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Open Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        heading: [
          "Poppins",
          "Open Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Messenger blue
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB", // primary
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Online green (success / qualified)
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669", // accent
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        // Indigo (secondary)
        secondary: {
          500: "#6366F1",
          600: "#4F46E5",
        },
        surface: {
          base: "#FFFFFF",
          subtle: "#F8FAFC",
          muted: "#F1F5FD",
          border: "#E4ECFC",
        },
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
        },
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "200ms",
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        thinking: "thinking 1.4s ease-in-out infinite",
        "skeleton": "skeleton 1.6s ease-in-out infinite",
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        thinking: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 4px -2px rgb(15 23 42 / 0.06)",
        "card-lg":
          "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 8px 24px -8px rgb(15 23 42 / 0.10)",
        glass:
          "0 1px 0 0 rgb(255 255 255 / 0.6) inset, 0 -1px 0 0 rgb(15 23 42 / 0.04) inset, 0 4px 24px -6px rgb(15 23 42 / 0.08)",
      },
      backgroundImage: {
        "mesh-soft":
          "radial-gradient(at 0% 0%, #DBEAFE 0px, transparent 40%), radial-gradient(at 100% 100%, #D1FAE5 0px, transparent 40%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
