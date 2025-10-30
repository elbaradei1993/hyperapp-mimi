import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-xl
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.96]
    shadow-sm hover:shadow-lg
    border border-transparent
    touch-manipulation
    select-none
    relative overflow-hidden
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-blue-500 to-blue-600
      hover:from-blue-600 hover:to-blue-700
      active:from-blue-700 active:to-blue-800
      text-white
      focus:ring-blue-500
      shadow-blue-500/25 hover:shadow-blue-500/40 active:shadow-blue-500/50
      border-blue-600/20
    `,
    secondary: `
      bg-gradient-to-r from-gray-100 to-gray-200
      hover:from-gray-200 hover:to-gray-300
      active:from-gray-300 active:to-gray-400
      text-gray-900
      focus:ring-gray-500
      shadow-gray-500/25 hover:shadow-gray-500/40 active:shadow-gray-500/50
      border-gray-300/50
      dark:from-gray-700 dark:to-gray-600
      dark:hover:from-gray-600 dark:hover:to-gray-500
      dark:active:from-gray-500 dark:active:to-gray-400
      dark:text-white
      dark:border-gray-600/50
    `,
    outline: `
      bg-transparent
      hover:bg-blue-50 active:bg-blue-100
      text-blue-600
      focus:ring-blue-500
      border-blue-300
      hover:border-blue-400 active:border-blue-500
      dark:hover:bg-blue-900/20 dark:active:bg-blue-900/30
      dark:text-blue-400
      dark:border-blue-600
      dark:hover:border-blue-500 dark:active:border-blue-400
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 active:bg-gray-200
      text-gray-700
      focus:ring-gray-500
      hover:text-gray-900 active:text-gray-900
      dark:hover:bg-gray-800 dark:active:bg-gray-700
      dark:text-gray-300
      dark:hover:text-white dark:active:text-white
      shadow-none hover:shadow-none
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-red-600
      hover:from-red-600 hover:to-red-700
      active:from-red-700 active:to-red-800
      text-white
      focus:ring-red-500
      shadow-red-500/25 hover:shadow-red-500/40 active:shadow-red-500/50
      border-red-600/20
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600
      hover:from-green-600 hover:to-green-700
      active:from-green-700 active:to-green-800
      text-white
      focus:ring-green-500
      shadow-green-500/25 hover:shadow-green-500/40 active:shadow-green-500/50
      border-green-600/20
    `,
    warning: `
      bg-gradient-to-r from-yellow-500 to-orange-500
      hover:from-yellow-600 hover:to-orange-600
      active:from-orange-500 active:to-red-500
      text-white
      focus:ring-yellow-500
      shadow-yellow-500/25 hover:shadow-yellow-500/40 active:shadow-yellow-500/50
      border-yellow-600/20
    `
  };

  const sizeClasses = {
    sm: 'px-4 sm:px-6 py-2 text-sm min-h-[44px] gap-2',
    md: 'px-6 sm:px-8 py-3 text-base min-h-[48px] gap-2',
    lg: 'px-8 sm:px-10 py-4 text-lg min-h-[56px] gap-3'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
