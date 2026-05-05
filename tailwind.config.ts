import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vett brand colors
        navy: {
          DEFAULT: '#1E3A5F',
          50: '#EEF2F7',
          100: '#C9D6E8',
          200: '#92ABCC',
          300: '#5B80B0',
          400: '#2D5590',
          500: '#1E3A5F',
          600: '#172E4C',
          700: '#102239',
          800: '#091626',
          900: '#030A13',
          950: '#020610',
        },
        teal: {
          DEFAULT: '#0F7B6C',
          50: '#E6F5F3',
          100: '#B3E3DC',
          200: '#66C7BA',
          300: '#1AAB97',
          400: '#0F7B6C',
          500: '#0C6259',
          600: '#094A43',
          700: '#06312D',
          800: '#031916',
          900: '#010808',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
        danger: '#DC2626',
        ink: {
          DEFAULT: '#07111f',
          950: '#030A13',
        },
        background: '#F9FAFB',
        foreground: '#111827',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '8px',
        input: '4px',
      },
      // Only `animate-blob` is referenced by the codebase (used by
      // GradientBlob). The other 8 animation utilities + their keyframes
      // were dead-code drag — pruned 2026-05-05. Re-add only when an
      // actual call site needs them.
      animation: {
        blob: 'blob 8s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -30px) scale(1.1)' },
          '50%': { transform: 'translate(-10px, 20px) scale(0.95)' },
          '75%': { transform: 'translate(15px, 10px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
