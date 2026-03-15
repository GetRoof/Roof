import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    join(__dirname, 'index.html'),
    join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted:      'rgb(var(--color-muted) / <alpha-value>)',
        border:     'rgb(var(--color-border) / <alpha-value>)',
        secondary:  'rgb(var(--color-secondary) / <alpha-value>)',
        accent:     '#7c3aed',
      },
      borderRadius: {
        md: '6px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        xs: '0px 1px 2px 0px rgba(0,0,0,0.10)',
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
}
