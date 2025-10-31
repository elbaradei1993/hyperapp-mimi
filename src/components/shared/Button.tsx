import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'mobile-sm' | 'mobile-md' | 'mobile-lg';
  mobileLayout?: 'full-width' | 'grid-2' | 'grid-3' | 'stack';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  mobileLayout,
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
      bg-gradient-to-r from-[var(--accent-primary)] to-[color-mix(in srgb, var(--accent-primary) 90%, black)]
      hover:from-[color-mix(in srgb, var(--accent-primary) 95%, black)] hover:to-[color-mix(in srgb, var(--accent-primary) 85%, black)]
      active:from-[color-mix(in srgb, var(--accent-primary) 90%, black)] active:to-[color-mix(in srgb, var(--accent-primary) 80%, black)]
      text-white
      focus:ring-[var(--accent-primary)]
      shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] active:shadow-[0_1px_4px_var(--shadow-color)]
      border-[color-mix(in srgb, var(--accent-primary) 80%, white)]/30
    `,
    secondary: `
      bg-gradient-to-r from-[var(--bg-tertiary)] to-[color-mix(in srgb, var(--bg-tertiary) 110%, white)]
      hover:from-[color-mix(in srgb, var(--bg-tertiary) 110%, white)] hover:to-[color-mix(in srgb, var(--bg-tertiary) 120%, white)]
      active:from-[color-mix(in srgb, var(--bg-tertiary) 120%, white)] active:to-[color-mix(in srgb, var(--bg-tertiary) 130%, white)]
      text-[var(--text-primary)]
      focus:ring-[var(--border-color)]
      shadow-[0_1px_3px_var(--shadow-color)] hover:shadow-[0_2px_6px_var(--shadow-color)] active:shadow-[0_1px_2px_var(--shadow-color)]
      border-[var(--border-color)]/40
    `,
    outline: `
      bg-transparent
      hover:bg-[color-mix(in srgb, var(--accent-primary) 95%, white)] active:bg-[color-mix(in srgb, var(--accent-primary) 90%, white)]
      text-[var(--accent-primary)]
      focus:ring-[var(--accent-primary)]
      border-[var(--border-color)]
      hover:border-[var(--accent-primary)] active:border-[color-mix(in srgb, var(--accent-primary) 90%, black)]
    `,
    ghost: `
      bg-transparent hover:bg-[var(--bg-tertiary)] active:bg-[color-mix(in srgb, var(--bg-tertiary) 110%, white)]
      text-[var(--text-secondary)]
      focus:ring-[var(--border-color)]
      hover:text-[var(--text-primary)] active:text-[var(--text-primary)]
      shadow-none hover:shadow-none
    `,
    danger: `
      bg-gradient-to-r from-[var(--danger)] to-[color-mix(in srgb, var(--danger) 90%, black)]
      hover:from-[color-mix(in srgb, var(--danger) 95%, black)] hover:to-[color-mix(in srgb, var(--danger) 85%, black)]
      active:from-[color-mix(in srgb, var(--danger) 90%, black)] active:to-[color-mix(in srgb, var(--danger) 80%, black)]
      text-white
      focus:ring-[var(--danger)]
      shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] active:shadow-[0_1px_4px_var(--shadow-color)]
      border-[color-mix(in srgb, var(--danger) 80%, white)]/30
    `,
    success: `
      bg-gradient-to-r from-[var(--success)] to-[color-mix(in srgb, var(--success) 90%, black)]
      hover:from-[color-mix(in srgb, var(--success) 95%, black)] hover:to-[color-mix(in srgb, var(--success) 85%, black)]
      active:from-[color-mix(in srgb, var(--success) 90%, black)] active:to-[color-mix(in srgb, var(--success) 80%, black)]
      text-white
      focus:ring-[var(--success)]
      shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] active:shadow-[0_1px_4px_var(--shadow-color)]
      border-[color-mix(in srgb, var(--success) 80%, white)]/30
    `,
    warning: `
      bg-gradient-to-r from-[var(--warning)] to-[color-mix(in srgb, var(--warning) 90%, black)]
      hover:from-[color-mix(in srgb, var(--warning) 95%, black)] hover:to-[color-mix(in srgb, var(--warning) 85%, black)]
      active:from-[color-mix(in srgb, var(--warning) 90%, black)] active:to-[color-mix(in srgb, var(--warning) 80%, black)]
      text-[var(--text-primary)]
      focus:ring-[var(--warning)]
      shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_4px_12px_var(--shadow-color)] active:shadow-[0_1px_4px_var(--shadow-color)]
      border-[color-mix(in srgb, var(--warning) 80%, white)]/30
    `
  };

  const sizeClasses = {
    sm: 'px-4 sm:px-6 py-2 text-sm min-h-[44px] gap-2',
    md: 'px-6 sm:px-8 py-3 text-base min-h-[48px] gap-2',
    lg: 'px-8 sm:px-10 py-4 text-lg min-h-[56px] gap-3',
    // Mobile-optimized sizes with better touch targets and responsive text
    'mobile-sm': 'px-3 py-2 text-sm min-h-[44px] gap-1.5',
    'mobile-md': 'px-4 py-3 text-base min-h-[48px] gap-2',
    'mobile-lg': 'px-5 py-4 text-lg min-h-[56px] gap-2.5'
  };

  // Mobile layout classes for responsive behavior
  const mobileLayoutClasses = {
    'full-width': 'w-full',
    'grid-2': 'flex-1 min-w-0', // Used within ButtonGroup
    'grid-3': 'flex-1 min-w-0', // Used within ButtonGroup
    'stack': 'w-full' // Used within ButtonGroup
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const mobileClass = mobileLayout ? mobileLayoutClasses[mobileLayout] : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${mobileClass} ${className}`.trim();

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
