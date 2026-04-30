/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#C89B3C',
        'gold-light': '#E6B84A',
      },
    },
  },
  plugins: [],
}
