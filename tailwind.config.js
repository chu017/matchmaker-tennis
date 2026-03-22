/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        court: {
          green: '#2d5016',
          line: '#ffffff',
          accent: '#f59e0b',
        },
        pink: {
          primary: '#FF5C97',
          accent: '#D81B60',
          soft: '#FFF0F6',
          muted: '#FCE4EC',
          text: '#1a1a1a',
          'text-muted': '#6b6b6b',
        },
      },
      boxShadow: {
        'card': '0 2px 20px -4px rgba(255, 92, 151, 0.12), 0 4px 16px -6px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        'spring-reveal': {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'draw-tab': {
          '0%': { opacity: '0', transform: 'scale(0.99) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'bracket-slide-next': {
          '0%': { opacity: '0', transform: 'translateX(18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bracket-slide-prev': {
          '0%': { opacity: '0', transform: 'translateX(-18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float-brand': {
          '0%, 100%': { transform: 'translateY(0) rotate(-5deg)' },
          '50%': { transform: 'translateY(-5px) rotate(5deg)' },
        },
        'header-glow': {
          '0%, 100%': { boxShadow: '0 2px 12px rgba(255, 92, 151, 0.2), 0 0 0 0 rgba(255, 92, 151, 0.08)' },
          '50%': { boxShadow: '0 4px 20px rgba(255, 92, 151, 0.35), 0 0 24px rgba(255, 92, 151, 0.12)' },
        },
        'orbit-dashed': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spring-reveal': 'spring-reveal 0.5s cubic-bezier(0.33, 1.24, 0.64, 1) both',
        'draw-tab': 'draw-tab 0.42s cubic-bezier(0.33, 1.2, 0.64, 1) both',
        'bracket-slide-next': 'bracket-slide-next 0.4s cubic-bezier(0.33, 1.35, 0.64, 1) both',
        'bracket-slide-prev': 'bracket-slide-prev 0.4s cubic-bezier(0.33, 1.35, 0.64, 1) both',
        'float-brand': 'float-brand 3.5s ease-in-out infinite',
        'header-glow': 'header-glow 3s ease-in-out infinite',
        'orbit-dashed': 'orbit-dashed 22s linear infinite',
      },
    },
  },
  plugins: [],
}
