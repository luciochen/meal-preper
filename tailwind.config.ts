import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f2f7f2",
          100: "#e8f0e8",
          200: "#d1e3d1",
          300: "#a8c8a8",
        },
        navy: "#0f172a",
        zest: "#76C83A",
        cream: "#FAF8F2",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
