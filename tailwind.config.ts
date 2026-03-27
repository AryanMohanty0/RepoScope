import type { Config } from "tailwindcss";

const config: Config = {
  // IMPORTANT: Tell Tailwind where to find your components
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // Added this because your lib is at the root
  ],
  theme: {
    extend: {
      // You can add custom "SaaS" colors here later
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"), // This powers the professional Markdown look
  ],
};

export default config;