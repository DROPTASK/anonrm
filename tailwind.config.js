/** @type {import('tailwindcss').Config} */
export default {
  // Tells Tailwind to scan these files for class names
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Dark mode based on user's system preferences or a CSS class
  darkMode: 'media', // Change to 'class' if you want a manual light/dark toggle button
  theme: {
    extend: {
      fontFamily: {
        // Overrides the default sans font with Inter
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Explicitly defining the dark mode background we used in index.css
        gray: {
          950: '#030712',
        }
      },
      animation: {
        // Wires up the custom animations we defined in index.css so you can use them as Tailwind utilities if needed
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'soft-pulse': 'softPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
