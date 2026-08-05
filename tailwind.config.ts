import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        // The header wordmark — a tighter, more geometric cut than Inter.
        brand: ["var(--font-brand)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
