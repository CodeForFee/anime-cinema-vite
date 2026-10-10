import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html",
    "./src/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
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
        // Tokens the Lightswind components (src/components/lightswind) expect.
        // Only the ones HeroUI does not already define, so its theme is untouched.
        popover: { DEFAULT: "#181818", foreground: "#ffffff" },
        card: { DEFAULT: "#181818", foreground: "#ffffff" },
        accent: { DEFAULT: "#2a2a2a", foreground: "#ffffff" },
        muted: { DEFAULT: "#262626", foreground: "#9ca3af" },
        input: "#3f3f46",
        ring: "#E50914",
      },
      // Used by the Lightswind Skeleton's shimmer sweep
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "sans-serif"],
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
  plugins: [
    heroui({
      defaultTheme: "dark",
      themes: {
        dark: {
          colors: {
            background: "#08090D",
            foreground: "#ECEDEE",
            primary: {
              50: "#3B090C",
              100: "#670E14",
              200: "#98151D",
              300: "#CA1C27",
              400: "#E50914",
              500: "#E50914",
              600: "#F04851",
              700: "#F57D84",
              800: "#F9B2B6",
              900: "#FDE8E9",
              DEFAULT: "#E50914",
              foreground: "#ffffff",
            },
            focus: "#E50914",
          },
        },
      },
    }),
  ],
};

export default config;
