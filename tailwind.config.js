/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#196F01',
          dim: 'rgba(25,111,1,0.15)',
          glow: 'rgba(25,111,1,0.3)',
          hover: '#1e8501',
        },
        bg: {
          primary: '#060608',
          secondary: '#0c0c0f',
          card: 'rgba(255,255,255,0.04)',
          hover: 'rgba(255,255,255,0.07)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          hover: 'rgba(255,255,255,0.14)',
          accent: 'rgba(57,211,0,0.3)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#a0a0a0',
          muted: '#555555',
        },
        priority: {
          low: '#3b82f6',
          medium: '#f59e0b',
          high: '#ef4444',
          urgent: '#ec4899',
        },
        status: {
          lead: '#6366f1',
          contacted: '#3b82f6',
          demo: '#f59e0b',
          negotiation: '#ef4444',
          closed: '#196F01',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
        xl: '40px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(25,111,1,0.15)',
        'glow': '0 0 20px rgba(25,111,1,0.25)',
        'glow-lg': '0 0 40px rgba(25,111,1,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
