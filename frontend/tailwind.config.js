/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E8000B',
          dark: '#C4000A',
          light: '#FF1A23'
        },
        dark: {
          DEFAULT: '#1d1d1f',
          lighter: '#3d3d3f',
          card: '#f5f5f7'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'PingFang TC', 'sans-serif']
      }
    }
  },
  plugins: []
}
