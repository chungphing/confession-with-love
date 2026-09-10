import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/shared-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        live: "var(--live)",
        card: "var(--card)",
        "on-accent": "var(--on-accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        paper: "var(--surface-image)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        pixel: ["var(--font-pixel)", "monospace"],
      },
      boxShadow: {
        pixel: "2px 2px 0 var(--shadow-pixel)",
      },
    },
  },
  plugins: [],
};

export default config;
