import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — matches public site exactly
        'diwan-bg':    '#180e04',
        'diwan-bg2':   '#221408',
        'diwan-bg3':   '#2c1a0a',
        'diwan-cream': '#f2e4c8',
        'diwan-dim':   '#b09a78',
        'diwan-gold':  '#c8922a',
        'diwan-gold2': '#e0ae55',
        // Management shell (light/paper)
        'paper':       '#fbf7ee',
        'paper2':      '#f5ede0',
        'ink':         '#2a1d10',
        'ink2':        '#6b4f33',
        // Kitchen shell (dark)
        'kds-bg':      '#0d0f13',
        'kds-panel':   '#151922',
        'kds-border':  '#2b3240',
        'kds-text':    '#f5efe4',
        // Semantic
        'status-green':  '#22c55e',
        'status-amber':  '#f59e0b',
        'status-red':    '#ef4444',
        'status-blue':   '#38bdf8',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'warm-sm': '0 2px 8px rgba(42,29,16,0.08)',
        'warm-md': '0 8px 24px rgba(42,29,16,0.12)',
        'warm-lg': '0 20px 60px rgba(42,29,16,0.16)',
        'gold-glow': '0 0 0 4px rgba(200,146,42,0.15)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 4px rgba(200,146,42,0.15)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(200,146,42,0.04)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
