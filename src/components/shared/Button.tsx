import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-4 py-3 rounded-lg text-sm font-semibold focus:outline-none transition-all duration-200 ease-in-out';

  const variantClasses = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-dark active:bg-accent-primary-dark',
    success: 'bg-success text-white hover:bg-success-dark active:bg-success-dark',
    danger: 'bg-danger text-white hover:bg-danger-dark active:bg-danger-dark',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      style={{
        // Mobile touch improvements
        WebkitTapHighlightColor: 'transparent',
        WebkitAppearance: 'none',
        touchAction: 'manipulation',
        // Ensure minimum touch target size
        minHeight: '44px',
        minWidth: '44px',
        // Better focus styles for accessibility
        outline: 'none',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        // Active state feedback
        ...props.style
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
