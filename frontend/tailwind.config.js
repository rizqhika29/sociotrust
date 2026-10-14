/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F6F1E6",
          deep: "#ECE3D0",
          card: "#FFFDF7",
        },
        ink: {
          DEFAULT: "#101D17",
          soft: "#1C2E26",
          mute: "#5B6E64",
        },
        pine: {
          DEFAULT: "#0C3527",
          deep: "#082418",
          bright: "#0E7A55",
        },
        mint: {
          DEFAULT: "#8FD8B4",
          pale: "#DDF2E5",
        },
        brass: {
          DEFAULT: "#A87B26",
          bright: "#E3B94E",
          pale: "#F5E7C6",
        },
        clay: {
          DEFAULT: "#B0532B",
          pale: "#F6E3D4",
        },
        oxblood: {
          DEFAULT: "#8E2F28",
          pale: "#F3D9D5",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        seal: "0 10px 30px -12px rgba(8, 36, 24, 0.45)",
        card: "0 2px 10px -4px rgba(16, 29, 23, 0.25)",
      },
    },
  },
  plugins: [],
};
