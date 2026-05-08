/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Temba brand tokens (mapped to Figma styles)
        ink: {
          DEFAULT: '#14172A', // Temba Black — primary text + default CTA bg
          900: '#0E1020',
          800: '#1A1F36',
          700: '#2A3147',
          mute: '#7E8B9F',    // Gray 1 — secondary text
        },
        line: {
          DEFAULT: '#DEE3EB', // Gray 2 — default borders
          soft: '#ECEFF4',
          strong: '#C9D0DA',
        },
        brand: {
          DEFAULT: '#3D3FE2', // Temba Blue
          50: '#ECEBFB',      // Light purple
          100: '#DAD8F7',
          500: '#4D4FE6',
          600: '#3D3FE2',
          700: '#2F31C9',
          800: '#2629A5',
        },
        accent: {
          DEFAULT: '#C68A1F', // Orange — conversion CTAs
          50: '#FBF1DD',
          100: '#F6E1B5',
          500: '#D49526',
          600: '#C68A1F',
          700: '#A87114',
        },
        cream: {
          DEFAULT: '#FAF7F2', // warm off-white surface
          deep: '#F4EFE6',
        },
        paper: '#FFFFFF',
      },
      fontSize: {
        // Disciplined type scale — no more drift across pages
        'micro':   ['11px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        'meta':    ['13px', { lineHeight: '1.5' }],
        'body':    ['15px', { lineHeight: '1.6' }],
        'body-lg': ['17px', { lineHeight: '1.6' }],
        'h3':      ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'h2':      ['28px', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'h1':      ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['52px', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        'xl2': '14px',
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(20, 23, 42, 0.04), 0 4px 12px rgba(20, 23, 42, 0.04)',
        'card-hover': '0 2px 6px rgba(20, 23, 42, 0.06), 0 14px 28px rgba(20, 23, 42, 0.08)',
        'pop':        '0 12px 32px rgba(20, 23, 42, 0.12)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
