/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#6366f1", hover: "#4f46e5", light: "#e0e7ff" },
        surface: "#ffffff",
        muted: "#64748b",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)",
        card: "0 4px 14px rgba(0,0,0,0.06)",
        "soft-lg": "0 20px 40px rgba(0,0,0,0.1)",
        "card-hover": "0 20px 40px -10px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        card: "12px",
        input: "8px",
      },
    },
  },
  plugins: [],
};
