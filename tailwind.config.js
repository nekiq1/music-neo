/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neo: {
          // Spotify-inspired dark + green accent, still unique
          bg: '#0b0b0f',
          card: '#121218',
          elevated: '#1a1a22',
          surface: '#16161e',
          border: '#2a2a35',
          muted: '#8a8a9a',
          text: '#f0f0f5',
          accent: '#1ed760',       // green like Spotify
          accent2: '#1db954',
          pink: '#ff6b9d',
          cyan: '#00d4ff',
          purple: '#a78bfa',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'neo': '0 0 0 1px rgba(30,215,96,0.08), 0 8px 32px rgba(0,0,0,0.45)',
        'glow': '0 0 28px rgba(30,215,96,0.22)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        }
      }
    }
  },
  plugins: []
}
