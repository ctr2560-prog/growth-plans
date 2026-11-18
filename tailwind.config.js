/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Sarah Redfern High School brand palette (Canva brand kit + artwork tones)
      colors: {
        brand: {
          blue: '#1d499f',
          red: '#bf2026',
          sky: '#9aaed4',
          ink: '#0F1A3D',
          slate: '#5B6478',
          paper: '#F4F7FB',
          line: '#E3E8F0',
          tint: '#EAF0FA',
        },
      },
      fontFamily: {
        display: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
