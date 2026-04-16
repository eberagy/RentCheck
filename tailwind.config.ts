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
        background: '#F9FAFB',
        foreground: '#111827',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      borderRadius: {
        card: '8px',
        input: '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
