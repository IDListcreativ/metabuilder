/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['DM Sans', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        violet: {
          950: '#1a1208',
        },
      },
      backgroundImage: {
        'gradient-glam': 'linear-gradient(135deg, #8b6914 0%, #c9a84c 50%, #a0722a 100%)',
        'gradient-glam-subtle': 'linear-gradient(135deg, rgba(139,105,20,0.15) 0%, rgba(160,114,42,0.15) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(42,34,24,0.9) 0%, rgba(30,24,16,0.95) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(201, 168, 76, 0.22)',
        'glow-md': '0 0 24px rgba(201, 168, 76, 0.32)',
        'glow-lg': '0 0 40px rgba(201, 168, 76, 0.38)',
        'glow-fuchsia': '0 0 24px rgba(160, 60, 70, 0.30)',
        'card': '0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.35)',
      },
      animation: {
        'gradient-shift': 'gradientShift 8s ease infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 1.8s infinite',
        'slide-up': 'slideUp 0.2s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};