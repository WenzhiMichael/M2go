export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#A31D36", // Signature Deep Red
          light: "#C21E42",
          dark: "#7A1629",
          cream: "#F9F7F2", // Very light parchment
          border: "#E1E4E8", // GitHub-like border
        },
      },
      fontFamily: {
        sans: [
          "Montserrat",
          "Noto Sans SC",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif"
        ],
        serif: [
          "Playfair Display",
          "Noto Serif SC",
          "Songti SC",
          "SimSun",
          "serif"
        ],
        mono: [
          "JetBrains Mono",
          "Noto Sans SC",
          "Microsoft YaHei",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace"
        ],
      },
      backgroundImage: {
         'parchment': "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBl2YVJzmqighfX6mmxS00_A8kNfAnVgBqPKVZutKH-nknqio1LPla9sZlUN4nsQaB_PAz7tAC4kY5971E741CQUoXdVIcPRvWR6pDN_eVDJykUIOCsOR6A8wO-42o5mU3xX5r9FaVofMWg-P4rtkKlpO-cXJuqx4_PS34HR8ad-1v5Mgu0Yip0PMOEzYD40vt1mKhn8o1wAl60VgcR8QzgtBD5Mq0VlOeJoGPdOm147xrArpJoPmCr-wUkA_y_GrQzGRkpHTxGW39')",
      }
    },
  },
  plugins: [],
};
