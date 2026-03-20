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
    },
  },
  plugins: [],
}
