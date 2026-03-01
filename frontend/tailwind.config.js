/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Clash Display', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#07070f',
          1: '#0d0d1a',
          2: '#12121f',
          3: '#18182a',
          4: '#1e1e35',
        },
        border: {
          DEFAULT: '#23233a',
          light: '#2d2d4a',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          glow: 'rgba(99,102,241,0.3)',
        },
        purple: {
          glow: 'rgba(139,92,246,0.2)',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#64748b',
          faint: '#334155',
        },
        success: { DEFAULT: '#10b981', light: '#34d399', bg: 'rgba(16,185,129,0.1)' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
        danger: { DEFAULT: '#ef4444', light: '#f87171', bg: 'rgba(239,68,68,0.1)' },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(99,102,241,0.25)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, hsla(240,100%,74%,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(263,100%,64%,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(219,100%,60%,0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
