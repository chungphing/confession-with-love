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
        card: "var(--card)",
        "on-accent": "var(--on-accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-rounded", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
