import type { Config } from "tailwindcss";

// Design tokens sourced from the UI/UX Pro Max skill recommendation for
// "Chat & Messaging App":
//   Primary style: Minimalism + Micro-interactions
//   Secondary: Glassmorphism + Flat Design
//   Palette: Messenger blue + online green + typing grey
//   Typography: "Modern Professional" (Poppins headings + Open Sans body)
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
      // Modular type scale (UX guideline: 12 14 16 18 24 32)
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em" }],
        "3xl": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.015em" }],
      },
      colors: {
        // Messenger blue (primary) — WCAG AA on white from 600+
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Online green (accent / qualified)
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        // Indigo (secondary, e.g. AI chips)
        secondary: {
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
        },
        // Surfaces
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC",
          muted: "#F1F5FD",
          border: "#E4ECFC",
        },
        // Ink
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          dim: "#94A3B8",
        },
      },
      // Z-index scale (UX guideline: defined system, no arbitrary 9999)
      zIndex: {
        base: "0",
        content: "10",
        sticky: "20",
        overlay: "30",
        modal: "40",
        toast: "50",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "180ms",
        slow: "280ms",
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        thinking: "thinking 1.4s ease-in-out infinite",
        skeleton: "skeleton 1.6s ease-in-out infinite",
        "fade-in": "fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "highlight": "highlight 1.4s ease-out",
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
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        highlight: {
          "0%": { backgroundColor: "rgba(37, 99, 235, 0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 4px -2px rgb(15 23 42 / 0.06)",
        "card-lg":
          "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 8px 24px -8px rgb(15 23 42 / 0.10)",
        glass:
          "0 1px 0 0 rgb(255 255 255 / 0.6) inset, 0 -1px 0 0 rgb(15 23 42 / 0.04) inset, 0 4px 24px -6px rgb(15 23 42 / 0.08)",
        glow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
      },
      backgroundImage: {
        "mesh-soft":
          "radial-gradient(at 0% 0%, #DBEAFE 0px, transparent 40%), radial-gradient(at 100% 100%, #D1FAE5 0px, transparent 40%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
