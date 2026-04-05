import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['var(--font-tajawal)', 'Tajawal', 'sans-serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#B8860B',
          light: '#D4A017',
          pale: '#FAF3E0',
        },
        ink: {
          DEFAULT: '#1A1208',
          soft: '#3D2F1A',
        },
        parchment: {
          DEFAULT: '#FDF8F0',
          dark: '#F5EDD8',
        },
      },
    },
  },
  plugins: [],
}
export default config
