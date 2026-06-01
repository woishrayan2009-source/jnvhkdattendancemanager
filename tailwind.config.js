/**
 * tailwind.config.js — Tailwind v4 compatibility note
 *
 * Tailwind v4 uses CSS-based configuration (@theme in index.css) and
 * largely ignores this file. However we keep it for editor tooling
 * (Tailwind IntelliSense reads content paths from here).
 *
 * All custom design tokens (colors, fonts, shadows) are defined as
 * CSS custom properties in src/index.css and referenced with @theme.
 *
 * @tailwindcss/forms is loaded via CSS @plugin in index.css (v4 way),
 * NOT via the plugins array here — that approach doesn't work with v4.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // theme.extend is still read by some v4 compat layers; keep for tooling.
  theme: {
    extend: {
      colors: {
        nvs: {
          navy:         '#1a3a5c',
          'navy-dark':  '#0f2440',
          gold:         '#d97706',
        },
        house: {
          nilgiri:  '#16a34a',
          arawali:  '#2563eb',
          shiwalik: '#dc2626',
          udaygiri: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-lg': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  // plugins array intentionally empty — @tailwindcss/forms loaded via CSS
  // @plugin directive in src/index.css (Tailwind v4 way)
  plugins: [],
}
