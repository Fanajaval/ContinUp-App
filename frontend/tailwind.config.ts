import type { Config } from "tailwindcss";

/**
 * TOKENS VISUELS — pilotés par les variables CSS de app/globals.css.
 * Un seul jeu de classes pour les deux thèmes : `bg-card`, `text-ink`,
 * `text-candle`… changent de valeur selon `.light` sur <html>.
 *
 * ⚠️ RÈGLE M4.7 : aucun token rouge, dans aucun thème.
 */

const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: v("--c-night"),
        surface: v("--c-surface"),
        card: v("--c-card"),
        line: v("--c-line"),

        ink: v("--c-ink"),
        muted: v("--c-muted"),
        faint: v("--c-faint"),

        candle: {
          DEFAULT: v("--c-candle"),
          soft: v("--c-candle-soft"),
          deep: v("--c-candle-deep"),
        },
        grow: {
          DEFAULT: v("--c-grow"),
          soft: v("--c-grow-soft"),
          deep: v("--c-grow-deep"),
        },
        mist: {
          DEFAULT: v("--c-mist"),
          soft: v("--c-mist-soft"),
          deep: v("--c-mist-deep"),
        },
        gold: {
          DEFAULT: v("--c-gold"),
          soft: v("--c-gold-soft"),
          deep: v("--c-gold-deep"),
        },
        ember: v("--c-ember"),

        /* Matériaux du rêve : constants, la scène ne change pas de thème */
        clay: "#8B5E4B",
        cream: "#EBD9C0",
        grass: "#3E7A55",
        stone: "#6F7683",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        candle: "0 0 24px -2px rgb(var(--glow-candle) / var(--glow-a))",
        "candle-lg": "0 0 60px -6px rgb(var(--glow-candle) / var(--glow-a-lg))",
        grow: "0 0 24px -4px rgb(var(--glow-grow) / var(--glow-a))",
        gold: "0 0 50px -4px rgb(var(--glow-gold) / var(--glow-a-lg))",
        lift: "0 18px 40px -18px rgb(0 0 0 / 0.35)",
      },
      keyframes: {
        flicker: {
          "0%,100%": { opacity: "1" },
          "45%": { opacity: "0.88" },
          "60%": { opacity: "0.97" },
          "72%": { opacity: "0.84" },
        },
        drift: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "18%": { opacity: "0.55" },
          "100%": { transform: "translateY(-38px) scale(1.7)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.06)", opacity: "0.8" },
        },
      },
      animation: {
        flicker: "flicker 4s ease-in-out infinite",
        drift: "drift 7s ease-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        breathe: "breathe 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
