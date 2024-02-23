module.exports = {
  content: ["./src/**/*.{html,js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        "other": {'min': '340px', 'max': '1200px'},
      },
      colors: {
        darkbg: "#1E293B",
        blue: {
          850: "#1e40af"
        },
        "success":'#198754',
      },
      maxHeight: {
        '128': '18.4rem',
      }
    },
  },
  plugins: [],
}