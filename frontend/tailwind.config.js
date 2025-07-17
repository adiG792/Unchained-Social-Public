/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}", // if using app directory
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F6',
        beige: {
          DEFAULT: '#F5EEDC',
          dark: '#E7DBC7',
          light: '#FCF8F2'
        },
        accent: {
          DEFAULT: '#E07A5F',
          soft: '#F4A261'
        },
        text: {
          DEFAULT: '#2F2F2F',
          muted: '#555'
        },
        border: '#D8CFC4'
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem'
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
};