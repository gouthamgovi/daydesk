/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // CSS variable references — actual values in globals.css per theme
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        must: 'var(--must)',
        'must-soft': 'var(--must-soft)',
        done: 'var(--done)',
        rolled: 'var(--rolled)',
        'rolled-soft': 'var(--rolled-soft)',
        overdue: 'var(--overdue)',
        'overdue-soft': 'var(--overdue-soft)',
        'due-today': 'var(--due-today)',
        'due-today-soft': 'var(--due-today-soft)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
      },
    },
  },
  plugins: [],
};
