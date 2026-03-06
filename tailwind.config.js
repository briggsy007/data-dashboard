/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 800: '#0f1729', 900: '#0a0f1a', 950: '#060a12' },
        teal: { 400: '#2dd4bf', 500: '#14b8a6' },
        gold: { 400: '#facc15', 500: '#eab308' },
      },
    },
  },
  plugins: [],
}
