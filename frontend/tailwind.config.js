/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        canvas:     'var(--bg-canvas)',
        shell:      'var(--bg-shell)',
        surface:    'var(--surface)',
        card:       'var(--surface-card)',
        hover:      'var(--surface-hover)',
        active:     'var(--surface-active)',
        elevated:   'var(--surface-elevated)',
        
        foreground: 'var(--foreground)',
        muted:      'var(--foreground-muted)',
        subtle:     'var(--foreground-subtle)',
        inverse:    'var(--foreground-inverse)',
        
        border:          'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'border-focus':  'var(--border-focus)',
        
        primary: {
          DEFAULT:    'var(--primary)',
          hover:      'var(--primary-hover)',
          soft:       'var(--primary-soft)',
          foreground: 'var(--primary-foreground)',
        },
        secondary:  'var(--secondary)',
        accent:     'var(--accent)',
        danger:     'var(--danger)',
        success:    'var(--success)',
        warning:    'var(--warning)',
        info:       'var(--info)',

        risk: {
          low:               'var(--risk-low-text)',
          'low-bg':          'var(--risk-low-bg)',
          'low-border':      'var(--risk-low-border)',
          moderate:          'var(--risk-moderate-text)',
          'moderate-bg':     'var(--risk-moderate-bg)',
          'moderate-border': 'var(--risk-moderate-border)',
          high:              'var(--risk-high-text)',
          'high-bg':         'var(--risk-high-bg)',
          'high-border':     'var(--risk-high-border)',
          critical:          'var(--risk-critical-text)',
          'critical-bg':     'var(--risk-critical-bg)',
          'critical-border': 'var(--risk-critical-border)',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
