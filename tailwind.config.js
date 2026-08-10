module.exports = {
  content: ["./frontend/*.html"],
  theme: {
    extend: {
      colors: {
        history: {
          bg: '#2B1D0F',
          card: '#F1E3BC',
          gold: '#A9791F',
          goldHover: '#7C5915',
          textMuted: '#6C5735',
          input: '#FBF6E8'
        },
        slate: {
          100: '#2B1F10', 200: '#3C2E19', 300: '#5B4726', 400: '#8A6F45',
          500: '#9C7F4E', 600: '#B79A61', 700: '#D8C28A', 800: '#E7D8AE', 900: '#F3E9D0'
        }
      }
    }
  },
  plugins: [],
}