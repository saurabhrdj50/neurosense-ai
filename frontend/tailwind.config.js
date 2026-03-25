/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#6366f1',
        secondary: '#06b6d4',
        accent:    '#a855f7',
        surface:   '#1e293b',
        danger:    '#ef4444',
        success:   '#22c55e',
        warning:   '#f59e0b',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
