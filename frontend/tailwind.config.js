/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50:  '#eef9ff',
          100: '#d9f0ff',
          200: '#bce4ff',
          300: '#8ed3ff',
          400: '#58b8fc',
          500: '#2f97f8',
          600: '#1a78ed',
          700: '#1361da',
          800: '#1650b0',
          900: '#17458b',
          950: '#122b55',
        },
        water: {
          50:  '#f0fdf9',
          100: '#ccfbee',
          200: '#9af5dc',
          300: '#60e9c6',
          400: '#2dd4af',
          500: '#14b898',
          600: '#0d937c',
          700: '#0f7565',
          800: '#115d52',
          900: '#124d44',
          950: '#042f2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
