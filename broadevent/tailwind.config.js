/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2f9',
          100: '#d9e2f3',
          200: '#b3c5e7',
          300: '#8da8db',
          400: '#678bcf',
          500: '#2B5EA7',
          600: '#1F3864',
          700: '#17375E',
          800: '#0f2440',
          900: '#081220',
        },
        broadcast: {
          red:  '#DC2626',
          blue: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn  0.25s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                           to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
