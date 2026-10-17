/** @type {import('tailwindcss').Config} */

/* Color tokens live in src/index.css as RGB channel triplets ("R G B"), which
   lets Tailwind compose opacity modifiers (bg-primary/10, border-primary/20…)
   via <alpha-value> while the same variables drive dark mode through the
   `dark` class on <html>. Tint/shadow tokens that are not plain colors stay
   as full CSS values and must not be used with alpha modifiers. */
const channel = (token) => `rgb(var(--${token}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: channel('background'),
        canvas:     channel('bg-canvas'),
        shell:      channel('bg-shell'),
        surface:    channel('surface'),
        card:       channel('surface-card'),
        hover:      channel('surface-hover'),
        active:     channel('surface-active'),
        elevated:   channel('surface-elevated'),

        foreground: channel('foreground'),
        muted:      channel('foreground-muted'),
        subtle:     channel('foreground-subtle'),
        inverse:    channel('foreground-inverse'),

        border:          channel('border'),
        'border-subtle': channel('border-subtle'),
        'border-strong': channel('border-strong'),
        'border-focus':  channel('border-focus'),

        primary: {
          DEFAULT:    channel('primary'),
          hover:      channel('primary-hover'),
          soft:       'var(--primary-soft)',
          foreground: channel('primary-foreground'),
        },
        secondary:  channel('secondary'),
        accent:     channel('accent'),
        danger:     channel('danger'),
        success:    channel('success'),
        warning:    channel('warning'),
        info:       channel('info'),

        risk: {
          low:               channel('risk-low-text'),
          'low-bg':          'var(--risk-low-bg)',
          'low-border':      'var(--risk-low-border)',
          moderate:          channel('risk-moderate-text'),
          'moderate-bg':     'var(--risk-moderate-bg)',
          'moderate-border': 'var(--risk-moderate-border)',
          high:              channel('risk-high-text'),
          'high-bg':         'var(--risk-high-bg)',
          'high-border':     'var(--risk-high-border)',
          critical:          channel('risk-critical-text'),
          'critical-bg':     'var(--risk-critical-bg)',
          'critical-border': 'var(--risk-critical-border)',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
