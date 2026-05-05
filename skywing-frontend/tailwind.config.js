/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        mono:  ['"Space Mono"', 'monospace'],
        sans:  ['"Outfit"', 'sans-serif'],
      },
      colors: {
        ink:  'rgb(var(--color-ink) / <alpha-value>)',
        panel:'rgb(var(--color-panel) / <alpha-value>)',
        rail: 'rgb(var(--color-rail) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        dim:  'rgb(var(--color-dim) / <alpha-value>)',
        muted:'rgb(var(--color-muted) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        head: 'rgb(var(--color-head) / <alpha-value>)',
        blue: {
          DEFAULT: 'rgb(var(--color-blue) / <alpha-value>)',
          light:   'rgb(var(--color-blue-light) / <alpha-value>)',
          dim:     'rgb(var(--color-blue-dim) / <alpha-value>)',
        },
        amber:{
          DEFAULT: 'rgb(var(--color-amber) / <alpha-value>)',
          light:   'rgb(var(--color-amber-light) / <alpha-value>)',
          dim:     'rgb(var(--color-amber-dim) / <alpha-value>)',
        },
        red:  {
          DEFAULT: 'rgb(var(--color-red) / <alpha-value>)',
          light:   'rgb(var(--color-red-light) / <alpha-value>)',
          dim:     'rgb(var(--color-red-dim) / <alpha-value>)',
        },
        green:{
          DEFAULT: 'rgb(var(--color-green) / <alpha-value>)',
          light:   'rgb(var(--color-green-light) / <alpha-value>)',
          dim:     'rgb(var(--color-green-dim) / <alpha-value>)',
        },
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.18s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn:    { from:{ opacity:0, transform:'translateY(-4px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        slideDown: { from:{ opacity:0, transform:'translateY(-8px)' }, to:{ opacity:1, transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
