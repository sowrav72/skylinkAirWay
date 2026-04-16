/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef1f7',
          100: '#d5dce9',
          200: '#aab9d3',
          300: '#7e96bd',
          400: '#5373a7',
          500: '#2a5091',
          600: '#1d3d78',
          700: '#142c5e',
          800: '#0c1c44',
          900: '#060e2a',
          950: '#030812',
        },
        gold: {
          300: '#f5d78e',
          400: '#f0c84a',
          500: '#e8b523',
          600: '#c99a10',
          700: '#9e780a',
        },
        sky: {
          accent: '#4fc3f7',
        }
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-right': 'slideRight 0.5s ease forwards',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideRight: {
          '0%': { opacity: 0, transform: 'translateX(-20px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232,181,35,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(232,181,35,0)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #060e2a 0%, #142c5e 50%, #0c1c44 100%)',
        'gold-gradient': 'linear-gradient(135deg, #e8b523 0%, #f5d78e 50%, #c99a10 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(20,44,94,0.8) 0%, rgba(6,14,42,0.95) 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'gold': '0 4px 24px rgba(232,181,35,0.25)',
        'gold-lg': '0 8px 40px rgba(232,181,35,0.35)',
        'navy': '0 4px 24px rgba(6,14,42,0.6)',
        'navy-lg': '0 12px 48px rgba(6,14,42,0.8)',
        'glass': '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
}
