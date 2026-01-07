import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Fact/Inference/Unverified colors with accessibility
        fact: {
          bg: "#dcfce7", // green-100
          border: "#16a34a", // green-600
          text: "#14532d", // green-900
        },
        inference: {
          bg: "#fef3c7", // yellow-100
          border: "#ca8a04", // yellow-600
          text: "#713f12", // yellow-900
        },
        unverified: {
          bg: "#fee2e2", // red-100
          border: "#dc2626", // red-600
          text: "#7f1d1d", // red-900
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
