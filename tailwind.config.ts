import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-inter)", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
        mono:    ["var(--font-mono)", "Fira Code", "monospace"],
      },
      colors: {
        arc: {
          bg:       "#0A0E1A",
          surface:  "#0F1629",
          surface2: "#141D35",
          border:   "#1E2D45",
          cyan:     "#22D3EE",
          amber:    "#F59E0B",
          green:    "#10B981",
          red:      "#EF4444",
          text:     "#E2E8F0",
          dim:      "#64748B",
          muted:    "#334155",
        },
      },
      borderRadius: {
        arc:    "12px",
        "arc-lg": "18px",
      },
      animation: {
        "scan-line":    "scan-line 4s ease-in-out infinite",
        "pulse-dot":    "pulse-dot 2s ease-in-out infinite",
        "logo-glow":    "logo-glow 3s ease-in-out infinite",
        "stream-pulse": "stream-pulse 1.5s ease-in-out infinite",
        "toast-in":     "toast-in 0.3s ease forwards",
      },
      maxWidth: { app: "480px" },
    },
  },
  plugins: [],
}

export default config
