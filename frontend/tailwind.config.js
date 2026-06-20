/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B1818',
          dark: '#5C1111',
          light: '#9B2020'
        },
        dark: {
          DEFAULT: '#2B2B2B',
          lighter: '#3D3D3D',
          card: '#4A4A4A'
        },
        steel: {
          DEFAULT: '#4A4A4A',
          light: '#5C5C5C'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif']
      }
    }
  },
  plugins: []
}
