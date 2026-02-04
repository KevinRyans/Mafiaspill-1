import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0b0f14",
        coal: "#141a24",
        slate: "#2a3442",
        mist: "#d4dee7",
        neon: "#32d6a7",
        ember: "#ff7a59",
        gold: "#f3c969",
        signal: "#47a3ff",
        threat: "#ff4d6d"
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Sora", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 30px rgba(50, 214, 167, 0.25)",
        card: "0 20px 40px rgba(5, 10, 20, 0.35)"
      },
      backgroundImage: {
        "hero-radial": "radial-gradient(circle at top right, rgba(50, 214, 167, 0.25), transparent 55%)",
        "grid": "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fadeUp 220ms ease-out"
      }
    }
  },
  plugins: []
} satisfies Config
