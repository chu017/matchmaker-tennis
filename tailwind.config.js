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
      },
    },
  },
  plugins: [],
}
