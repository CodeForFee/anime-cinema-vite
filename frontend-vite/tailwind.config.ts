import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090D",
        surface: "#10121A",
        surfaceLight: "#181B26",
        surfaceBorder: "rgba(255, 255, 255, 0.08)",
        primaryRed: "#E50914",
        accentCyan: "#00F5D4",
        accentViolet: "#7928CA",
        accentGold: "#FFB800",
        // Tokens the UI primitives (src/shared/ui) expect
        foreground: "#ECEDEE",
        primary: { DEFAULT: "#E50914", foreground: "#ffffff" },
        popover: { DEFAULT: "#181818", foreground: "#ffffff" },
        card: { DEFAULT: "#181818", foreground: "#ffffff" },
        accent: { DEFAULT: "#2a2a2a", foreground: "#ffffff" },
        muted: { DEFAULT: "#262626", foreground: "#9ca3af" },
        input: "#3f3f46",
        ring: "#E50914",
      },
      // Softer corners app-wide: cards are near-square with a light round (Tailwind's defaults are .75/1/1.5rem)
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.5rem",
        "3xl": "0.75rem",
      },
      // Used by the Lightswind Skeleton's shimmer sweep
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      fontFamily: {
        // a single typeface; "display" stays as an alias so headings keep their class
        sans: ["\"Be Vietnam Pro\"", "system-ui", "sans-serif"],
        display: ["\"Be Vietnam Pro\"", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cinema-gradient": "linear-gradient(180deg, rgba(8,9,13,0) 0%, rgba(8,9,13,0.85) 70%, #08090D 100%)",
        "cinema-hero-mask": "linear-gradient(90deg, #08090D 0%, rgba(8,9,13,0.8) 40%, rgba(8,9,13,0) 100%)",
        "card-glass": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
      },
      boxShadow: {
        "glass-glow": "0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
        "card-hover": "0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 25px 2px rgba(229, 9, 20, 0.2)",
        "cyan-glow": "0 0 25px -5px rgba(0, 245, 212, 0.4)",
      },
    },
  },
  darkMode: "class",
  // hover styles only where a pointer can hover: a tap on a touch screen never leaves a card "hovered"
  future: { hoverOnlyWhenSupported: true },
};

export default config;
