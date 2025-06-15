module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          500: '#2196f3',
          600: '#1976d2',
          700: '#1565c0',
        }
      }
    },
  },
  plugins: [],
}
