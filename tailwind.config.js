/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/shared/Button.tsx",
  ],
  safelist: [
    // Button responsive classes to prevent purging
    'px-4', 'py-2', 'text-base',
    'px-3', 'py-1.5', 'text-sm',
    'px-6', 'py-3', 'text-lg',
    'px-8', 'py-4', 'text-xl',
    'px-10', 'py-4', 'text-xl',
    'sm:px-3', 'sm:py-1.5', 'sm:text-sm',
    'sm:px-4', 'sm:py-2', 'sm:text-base',
    'sm:px-6', 'sm:py-3', 'sm:text-lg',
    'sm:px-8', 'sm:py-4', 'sm:text-xl',
    'sm:px-10', 'sm:py-4', 'sm:text-xl',
    // Button variants
    'bg-blue-600', 'hover:bg-blue-700', 'text-white', 'focus:ring-blue-500',
    'bg-gray-200', 'hover:bg-gray-300', 'text-gray-900', 'focus:ring-gray-500',
    'bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500',
    'bg-green-600', 'hover:bg-green-700', 'focus:ring-green-500',
    'bg-yellow-600', 'hover:bg-yellow-700', 'focus:ring-yellow-500',
    // Button states
    'opacity-50', 'cursor-not-allowed',
    'inline-flex', 'items-center', 'justify-center',
    'font-medium', 'rounded-lg', 'transition-colors', 'duration-200',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2',
    // Loading spinner
    'animate-spin', '-ml-1', 'mr-2', 'h-4', 'w-4',
    // Mobile touch targets
    'min-h-[44px]', 'sm:min-h-[auto]',
    // Touch manipulation
    'touch-manipulation'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
