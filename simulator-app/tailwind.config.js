/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          50: '#f4f6f8',
          100: '#e3e8ef',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
          500: '#475569',
          600: '#334155',
          700: '#1e293b',
          800: '#0f172a',
          900: '#020617',
        },
        siemens: {
          bg: '#DCDCDC', // Panel background
          header: '#343A40',
          accent: '#009999', // Cyan/Teal
          active: '#28A745', // Green
          error: '#DC3545', // Red
          warning: '#FFC107', // Yellow
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
