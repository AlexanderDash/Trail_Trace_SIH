/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          50: "#f4f7fb",
          100: "#e6edf6",
          200: "#c5d2e4",
          300: "#8ea3c0",
          400: "#5c7494",
          500: "#3d5574",
          600: "#2c3f59",
          700: "#1c2b40",
          800: "#121c2c",
          900: "#0b1220",
          950: "#070b14",
        },
        intel: {
          DEFAULT: "#3ee0c5",
          dim: "#1a8f7d",
        },
        signal: {
          amber: "#f5b942",
          rose: "#f07178",
          blue: "#6ea8ff",
        },
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(62, 224, 197, 0.08), 0 18px 40px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
