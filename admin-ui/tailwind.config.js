/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
          'border-strong': '#cbd5e1',
        },
        sidebar: {
          DEFAULT: '#0c0e14',
          hover: '#161922',
          active: '#1c2030',
          border: 'rgba(255,255,255,0.06)',
          text: '#94a3b8',
          'text-active': '#f8fafc',
        },
      },
      boxShadow: {
        card: '0 0 0 1px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 24px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 0 0 1px rgba(99, 102, 241, 0.12), 0 8px 24px rgba(99, 102, 241, 0.12), 0 24px 48px rgba(15, 23, 42, 0.08)',
        elevated: '0 0 0 1px rgba(15, 23, 42, 0.06), 0 24px 64px rgba(15, 23, 42, 0.16)',
        glow: '0 0 0 1px rgba(99, 102, 241, 0.2), 0 0 24px rgba(99, 102, 241, 0.15)',
        'inner-soft': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(59, 130, 246, 0.05) 0px, transparent 50%)',
        'mesh-auth':
          'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(99, 102, 241, 0.35) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 50%), radial-gradient(ellipse 50% 60% at 60% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)',
        'sidebar-gradient': 'linear-gradient(180deg, #0c0e14 0%, #12151f 50%, #0f1219 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
