/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          800: '#1a2332',
          850: '#151c28',
          900: '#0f1622',
          950: '#090e17',
        },
        income:  '#22c55e',
        expense: '#ef4444',
        asset:   '#3b82f6',
        worth:   '#a855f7',
        budget:  '#f59e0b',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
