/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    /* Typography scale — the single source of truth. Roles, not sizes. */
    fontSize: {
      display: ["clamp(2.5rem, 5vw + 1rem, 4.5rem)", { lineHeight: "1.02", fontWeight: "800", letterSpacing: "-0.03em" }],
      h1: ["clamp(1.75rem, 2vw + 1rem, 2.25rem)", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
      h2: ["1.5rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.015em" }],
      h3: ["1.125rem", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.01em" }],
      h4: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
      "body-lg": ["1.0625rem", { lineHeight: "1.6" }],
      body: ["0.9375rem", { lineHeight: "1.55" }],
      small: ["0.8125rem", { lineHeight: "1.45", fontWeight: "500", letterSpacing: "0.005em" }],
      caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.01em" }],
      button: ["0.9375rem", { lineHeight: "1", fontWeight: "600", letterSpacing: "0.05em" }],
      label: ["0.8125rem", { lineHeight: "1.3", fontWeight: "600" }],
      "nav-item": ["0.9375rem", { lineHeight: "1.3", fontWeight: "500" }],
      th: ["0.8125rem", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.01em" }],
      td: ["0.875rem", { lineHeight: "1.4" }],
      stat: ["2rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
      question: ["clamp(1.375rem, 1rem + 1vw, 1.75rem)", { lineHeight: "1.35", fontWeight: "600", letterSpacing: "-0.01em" }],
      option: ["1.0625rem", { lineHeight: "1.45", fontWeight: "500" }],
      timer: ["1.5rem", { lineHeight: "1", fontWeight: "600" }],
      code: ["0.9375rem", { lineHeight: "1", fontWeight: "500", letterSpacing: "0.08em" }],
      chat: ["0.9375rem", { lineHeight: "1.6" }],
    },
    extend: {
      colors: {
        headings: "hsl(var(--headings))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ['"Inter Tight"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        button: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft": "pulse-soft 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
