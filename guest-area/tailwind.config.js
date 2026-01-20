/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores dinâmicas via CSS variables (whitelabel)
        primary: 'var(--primary, #3B82F6)',
        secondary: 'var(--secondary, #10B981)',
        accent: 'var(--accent, #F59E0B)',
      },
    },
  },
  plugins: [],
}
