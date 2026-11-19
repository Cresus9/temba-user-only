/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#03061E',
          900: '#03061E',
          800: '#12152A',
          700: '#2E3147',
          2: '#2E3147',
          3: '#5E6178',
          4: '#9497AB',
          mute: '#5E6178',
        },
        line: {
          DEFAULT: '#E6E7EE',
          soft: '#F4F5FA',
          strong: '#D5D6E0',
        },
        brand: {
          DEFAULT: '#3D3FE2',
          50: '#ECECFD',
          100: '#DAD8F7',
          500: '#4D4FE6',
          600: '#3D3FE2',
          700: '#2F3095',
          800: '#2F3095',
          dark: '#2F3095',
        },
        accent: {
          DEFAULT: '#F6B84A',
          50: '#FFF5E0',
          100: '#FFE8B8',
          500: '#F6B84A',
          600: '#F6B84A',
          700: '#8A5A00',
        },
        surf: '#F4F5FA',
        ok: '#0B7A52',
        cream: {
          DEFAULT: '#F4F5FA',
          deep: '#ECECFD',
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
