/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          50:  '#f0f4f8',
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
          400: '#6e7681',
          300: '#8b949e',
        },
        teal: {
          300: '#7ee8de',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        crimson: {
          400: '#f87171',
          500: '#ef4444',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"Outfit"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'slide-in':    'slideIn 0.4s ease forwards',
        'fade-up':     'fadeUp 0.5s ease forwards',
        'fade-in':     'fadeIn 0.3s ease forwards',
        'pulse-teal':  'pulseTeal 2s ease-in-out infinite',
        'count-up':    'fadeIn 0.6s ease forwards',
        'shimmer':     'shimmer 1.8s infinite',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        slideIn:    { '0%': { opacity:0, transform:'translateX(-16px)' }, '100%': { opacity:1, transform:'translateX(0)' } },
        fadeUp:     { '0%': { opacity:0, transform:'translateY(12px)' }, '100%': { opacity:1, transform:'translateY(0)' } },
        fadeIn:     { '0%': { opacity:0 }, '100%': { opacity:1 } },
        pulseTeal:  { '0%,100%': { boxShadow:'0 0 0 0 rgba(20,184,166,0.4)' }, '50%': { boxShadow:'0 0 0 8px rgba(20,184,166,0)' } },
        shimmer:    { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
}
