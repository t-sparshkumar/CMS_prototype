/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]', '[data-theme="midnight"]'],
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
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
          'border-strong': '#cbd5e1',
        },
        sidebar: {
          DEFAULT: '#ffffff',
          hover: '#f1f5f9',
          active: '#eff6ff',
          border: '#e2e8f0',
          text: '#64748b',
          'text-active': '#2563eb',
        },
        status: {
          operational: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
          degraded: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
          down: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
        },
        liberty: {
          red: '#e30613',
          'red-dark': '#c00510',
          dark: '#1c1c1c',
          gray: '#f4f4f4',
          'gray-mid': '#6b6b6b',
          white: '#ffffff',
        },
      },
      maxWidth: {
        liberty: '1280px',
      },
      height: {
        'liberty-nav': '64px',
        'liberty-utility': '40px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.08)',
        elevated: '0 4px 24px rgba(15, 23, 42, 0.12)',
        glow: '0 0 0 1px rgba(37, 99, 235, 0.15), 0 0 20px rgba(37, 99, 235, 0.12)',
        'inner-soft': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 40% 20%, rgba(37, 99, 235, 0.04) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.03) 0px, transparent 50%)',
        'mesh-auth':
          'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(37, 99, 235, 0.2) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
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
