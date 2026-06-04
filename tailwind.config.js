/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0f0f11',
          card: '#f7f7f8',
          'card-dark': '#18181b',
          border: '#e4e4e7',
          'border-dark': '#27272a',
        },
        primary: {
          DEFAULT: '#000000',
          hover: '#1a1a1a',
          light: '#f4f4f5',
          muted: '#71717a',
        },
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#dbeafe',
        }
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 40px rgba(37, 99, 235, 0.12)',
      },
    },
  },
  plugins: [],
}
