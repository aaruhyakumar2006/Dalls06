import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep old colors for backward compatibility during migration
        bg: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        rail: "var(--rail)",
        court: "var(--court-blue)",
        smash: "var(--smash-pink)",
        shuttle: "var(--shuttle-yellow)",
        mint: "var(--mint)",
        tangerine: "var(--tangerine)",
        fixed: "var(--fixed)",
        
        // New modern color palette
        primary: {
          DEFAULT: '#4ECDC4',
          dark: '#45B7AF',
        },
        secondary: {
          DEFAULT: '#FF6B6B',
          light: '#FFB84D',
        },
        accent: {
          purple: '#9B7EBD',
          yellow: '#FFE66D',
        },
        background: {
          DEFAULT: '#FAFAFA',
          cream: '#FFF8E7',
        },
        text: {
          DEFAULT: '#2C3E50',
          muted: '#7F8C8D',
        },
        success: '#6BCF7F',
        warning: '#FFB84D',
        error: '#FF6B6B',
      },
      fontFamily: {
        display: ["var(--font-unbounded)", "sans-serif"],
        body: ["var(--font-onest)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        // Keep old shadows for backward compatibility
        sticker: "0 4px 0 var(--ink)",
        "sticker-sm": "0 2px 0 var(--ink)",
        "sticker-lg": "0 6px 0 var(--ink)",
        "sticker-yellow": "0 4px 0 #FFD21F",
        "sticker-pink": "0 4px 0 #FF3B7F",
        "sticker-blue": "0 4px 0 #2E5BFF",
        "sticker-mint": "0 4px 0 #12D6A5",
        
        // New soft shadows
        "card-soft": "0 4px 12px rgba(0,0,0,0.08)",
        "card-hover": "0 8px 16px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        card: "18px",
        "card-new": "20px",
        "card-xl": "24px",
        pill: "999px",
      },
      screens: {
        xs: "420px",
      },
    },
  },
  plugins: [],
};

export default config;
