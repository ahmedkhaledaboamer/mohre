export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: { DEFAULT: '#0B1B2E', 2: '#13263D', 3: '#2A4363' },
        primary: { DEFAULT: '#0F7F81', hover: '#0B6A6C', strong: '#0A5D5F', soft: '#E4F2F2' },
        ink: { DEFAULT: '#0E1726', 2: '#3B4656' },
        muted: '#687283',
        line: { DEFAULT: '#E4E7EB', strong: '#CBD2DA' },
        canvas: '#F5F6F8',
        surface: '#FFFFFF',
        subtle: '#F0F2F5',
        success: { DEFAULT: '#1D8556', soft: '#E7F4ED' },
        warning: { DEFAULT: '#A86B12', soft: '#FBF2E2' },
        danger: { DEFAULT: '#BE3B35', soft: '#FBEBEA' },
        info: { DEFAULT: '#2D6AAE', soft: '#E9F0F9' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(14,23,38,0.04), 0 1px 1px rgba(14,23,38,0.03)',
        pop: '0 12px 32px -8px rgba(14,23,38,0.18), 0 2px 6px rgba(14,23,38,0.06)',
      },
    },
  },
  plugins: [],
};
