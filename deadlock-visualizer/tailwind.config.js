export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.12)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        pulsefast: 'pulse 1.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
