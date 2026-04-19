/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono:  ['"Space Mono"', 'monospace'],
        sans:  ['"Outfit"', 'sans-serif'],
      },
      colors: {
        ink:  '#0B1120',
        panel:'#111827',
        rail: '#1F2937',
        line: '#374151',
        dim:  '#6B7280',
        muted:'#9CA3AF',
        body: '#D1D5DB',
        head: '#F9FAFB',
        blue: {
          DEFAULT: '#2563EB',
          light:   '#3B82F6',
          dim:     '#1E3A5F',
        },
        amber:{
          DEFAULT: '#D97706',
          light:   '#F59E0B',
          dim:     '#451A03',
        },
        red:  {
          DEFAULT: '#DC2626',
          light:   '#EF4444',
          dim:     '#450A0A',
        },
        green:{
          DEFAULT: '#16A34A',
          light:   '#22C55E',
          dim:     '#052E16',
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