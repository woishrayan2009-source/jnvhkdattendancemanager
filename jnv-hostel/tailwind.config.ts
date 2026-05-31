import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // JNV brand palette
        navy: {
          50:  '#e8edf5',
          100: '#c5d0e6',
          200: '#9fb0d5',
          300: '#7890c3',
          400: '#5c77b6',
          500: '#3f5da9',
          600: '#3754a0',
          700: '#2c4896',
          800: '#1e3a5f',  // primary
          900: '#0f1e33',
        },
        gold: {
          50:  '#fdf8e8',
          100: '#fbedc5',
          200: '#f8e09f',
          300: '#f5d278',
          400: '#f3c85e',
          500: '#f0bd44',  // primary accent
          600: '#e8ae35',
          700: '#d99b28',
          800: '#c8891c',
          900: '#a66b0e',
        },
        // Four house colors
        house: {
          nilgiri:  '#16a34a', // green-600
          aravali:  '#2563eb', // blue-600
          shivalik: '#d97706', // amber-600
          udaygiri: '#dc2626', // red-600
        },
        // Attendance status colors
        status: {
          present:  '#16a34a',
          absent:   '#dc2626',
          leave:    '#d97706',
          sickbay:  '#7c3aed',
          duty:     '#0891b2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      screens: {
        xs: '375px', // minimum mobile target
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover':
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
