/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        /* Academic theme — Computer Modern if the user has it, otherwise the
           closest widely-installed old-style serif stack. */
        academic: [
          'Computer Modern Serif',
          'Latin Modern Roman',
          'CMU Serif',
          'Palatino Linotype',
          'Palatino',
          'Georgia',
          'ui-serif',
          'serif',
        ],
        /* Simplistic / ATS theme — boring on purpose. Parsers like boring. */
        ats: ['Calibri', 'Carlito', 'Helvetica Neue', 'Arial', 'ui-sans-serif', 'sans-serif'],
        /* Tech theme */
        tech: [
          'Inter',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'ui-sans-serif',
          'sans-serif',
        ],
        /* Swish / Marker themes — ported from a LaTeX .sty, so the stack leads
           with the fonts LaTeX would actually have used. */
        latex: [
          'Latin Modern Roman',
          'Computer Modern Serif',
          'CMU Serif',
          'TeX Gyre Pagella',
          'Palatino Linotype',
          'Georgia',
          'ui-serif',
          'serif',
        ],
        'latex-sans': [
          'Latin Modern Sans',
          'CMU Sans Serif',
          'TeX Gyre Heros',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'ui-sans-serif',
          'sans-serif',
        ],
        mono: ['SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* ---- App chrome (editor UI, not the résumé itself) ----

           Every entry is a custom property from shared/themes.css, so the
           whole editor repaints when the suite theme changes and there is no
           hex here to drift out of step with the other five apps. Light/dark
           is themes.css's job now; nothing in this file knows about it.

           Opacity modifiers (bg-ui-surface/50) do not work on a var() colour
           in Tailwind 3 — pick the token that already means what you want
           instead of fading one that does not. */
        ui: {
          bg: 'var(--bg)',
          sunken: 'var(--bg-sunken)',
          surface: 'var(--surface)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
          line: 'var(--border)',
          'line-strong': 'var(--border-strong)',
          text: 'var(--text)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-soft': 'var(--accent-soft)',
          'on-accent': 'var(--accent-contrast)',
          success: 'var(--success)',
          'success-soft': 'var(--success-soft)',
          warning: 'var(--warning)',
          'warning-soft': 'var(--warning-soft)',
          danger: 'var(--danger)',
          'danger-soft': 'var(--danger-soft)',
        },
        /* ---- The résumé sheet's own greys ----

           Deliberately literal, and deliberately not themed. The preview is a
           printable document: it is ink on white paper whichever palette the
           editor around it is wearing, and the exported PDF has to be
           byte-for-byte the same from Paper as from Midnight. Only
           src/components/themes/** and the layout miniatures should use these. */
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      spacing: {
        /* US Letter at 96dpi, used for the on-screen "paper". */
        page: '8.5in',
        'page-h': '11in',
        /* Chrome density, from shared/themes.css. Bars and controls written in
           these shrink for real under `data-density="compact"` and under the
           max-height:900px rule that auto-engages on a 13" laptop — which is
           the point: hiding a bar reclaims all of it, compact reclaims a third
           of every bar that stays. */
        bar: 'var(--bar-height)',
        control: 'var(--control-height)',
        'bar-x': 'var(--bar-pad-x)',
        'control-x': 'var(--control-pad-x)',
      },
      boxShadow: {
        /* The sheet's drop shadow is part of the document illusion, so it is
           literal. Panel elevation is chrome and follows the theme. */
        paper: '0 1px 2px rgba(15,23,42,.06), 0 12px 32px -12px rgba(15,23,42,.25)',
        panel: 'var(--shadow-sm)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out both',
      },
    },
  },
  plugins: [],
};
