/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5E6AD2',
          hover: '#4F5BB8',
          muted: '#8299FF',
        },
        dark: {
          base: '#0F0F10',
          surface: '#1A1A1D',
          elevated: '#222326',
          hover: '#2A2A2E',
          border: 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.15)',
        },
        text: {
          primary: '#EDEDED',
          secondary: '#A0A0A8',
          muted: '#636369',
        },
        status: {
          pending: '#CA8E1B',
          'in-progress': '#2E7CD1',
          completed: '#2D9964',
        },
        priority: {
          high: '#CD4945',
          medium: '#CA8E1B',
          low: '#2E7CD1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      }
    }
  },
  plugins: []
}
