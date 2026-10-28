/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#052A66',
          700: '#0A44A8',
          800: '#073685',
        },
        green: {
          600: '#0E7C5A',
          700: '#0A6246',
          50: '#E8F7F1',
          100: '#D1EFE4',
        },
        lime: {
          300: '#C6EBA0',
          400: '#B4E385',
          200: '#DAF3C1',
        },
        orange: {
          500: '#F26B21',
          600: '#D85711',
          50: '#FFF4EE',
        },
        ink: '#0B1B3A',
        muted: '#5B6B8A',
        surface: '#F4F7FD',
        line: '#E3E9F5',
      },
      borderRadius: {
        'card': '20px',
        'panel': '28px',
        'hero': '48px',
        'pill': '9999px',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 30px -5px rgba(11, 27, 58, 0.06), 0 4px 12px -2px rgba(11, 27, 58, 0.04)',
        'soft-lg': '0 20px 40px -10px rgba(5, 42, 102, 0.12), 0 8px 16px -4px rgba(5, 42, 102, 0.06)',
        'hero': '0 30px 60px -15px rgba(5, 42, 102, 0.35)',
      }
    },
  },
  plugins: [],
}
