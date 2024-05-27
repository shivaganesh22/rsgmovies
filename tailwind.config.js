module.exports = {
  content: ["./src/**/*.{html,js,jsx}",'node_modules/flowbite-react/lib/esm/**/*.js'],
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
         primary: {"50":"#f5f3ff","100":"#ede9fe","200":"#ddd6fe","300":"#c4b5fd","400":"#a78bfa","500":"#8b5cf6","600":"#7c3aed","700":"#6d28d9","800":"#5b21b6","900":"#4c1d95","950":"#2e1065"}
      },
      maxHeight: {
        '128': '18.4rem',
      },
      width: {
        '128': '35rem',
      },
      maxWidth: {
        '128': '35rem',
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
],
}