import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.emerald,
        nutrition: colors.amber,
        surface: {
          bg: colors.slate[50],
          bgAlt: colors.slate[100],
          card: '#ffffff',
          text: colors.slate[800],
          textStrong: colors.slate[900],
        },
      },
      borderRadius: {
        card: '1.5rem',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
