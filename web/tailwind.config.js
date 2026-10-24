/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3A57E8', // Hope UI signature royal blue
          600: '#2c43c7',
          700: '#1d2fa3',
          800: '#1e3a8a',
          900: '#0f172a',
        },
        accent: {
          cyan: '#08B1BA',
          teal: '#00C5C8',
          purple: '#7b2cbf',
          coral: '#f87171',
        },
        surface: {
          bg: '#f4f6fc',
          card: '#ffffff',
          sidebar: '#ffffff',
          border: '#e9ecef',
          muted: '#8A92A6',
          heading: '#1E293B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(18, 38, 63, 0.05)',
        'card-hover': '0 8px 24px -2px rgba(18, 38, 63, 0.1)',
        'blue-glow': '0 8px 20px -4px rgba(58, 87, 232, 0.4)',
      }
    },
  },
  plugins: [],
}
